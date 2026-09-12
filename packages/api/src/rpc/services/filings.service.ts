import { ORPCError } from "@orpc/server";

import type { Filing } from "@nationa/db";

import { assertCompanyAccess } from "../../auth/access";
import { recordActivity } from "../../services/activity";
import { listInvoicesForPeriod } from "../../services/invoices";
import { notify } from "../../services/notifications";
import type { Context } from "../context";
import * as repo from "../repositories/filings.repo";

export type FilingStatus = "draft" | "ready" | "under_review";

export type FilingRateLine = {
  rate: number | null;
  base: number;
  tax: number;
};

export type FilingTotals = {
  outputBase: number;
  outputTax: number;
  inputBase: number;
  inputTax: number;
  netTaxDue: number;
  byRate: FilingRateLine[];
  invoiceIds: string[];
  invoiceCount: number;
  currency: string;
};

function toDecimal(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return value.toFixed(3);
}

function toNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export async function computeFilingTotals(
  ctx: Context,
  input: { companyId: string; periodStart: string; periodEnd: string },
): Promise<FilingTotals> {
  const rows = await listInvoicesForPeriod(ctx, {
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    statuses: ["verified"],
  });

  let outputBase = 0;
  let outputTax = 0;
  let inputBase = 0;
  let inputTax = 0;
  let currency = "TND";
  const rateBuckets = new Map<string, FilingRateLine>();

  for (const row of rows) {
    const subtotal = toNumber(row.invoice.subtotal);
    const tax = toNumber(row.invoice.taxAmount);
    currency = row.invoice.currency || currency;
    if (row.invoice.direction === "sale") {
      outputBase += subtotal;
      outputTax += tax;
    } else {
      inputBase += subtotal;
      inputTax += tax;
    }

    for (const line of row.lines) {
      const lineTotal = toNumber(line.lineTotal);
      const lineTax = toNumber(line.taxAmount);
      const rate = line.taxRate === null ? null : Number(line.taxRate);
      const key = rate === null || !Number.isFinite(rate) ? "none" : rate.toFixed(2);
      const bucket = rateBuckets.get(key) ?? {
        rate: key === "none" ? null : Number(key),
        base: 0,
        tax: 0,
      };
      bucket.base += lineTotal;
      bucket.tax += lineTax;
      rateBuckets.set(key, bucket);
    }
  }

  return {
    outputBase: round(outputBase),
    outputTax: round(outputTax),
    inputBase: round(inputBase),
    inputTax: round(inputTax),
    netTaxDue: round(outputTax - inputTax),
    byRate: [...rateBuckets.values()]
      .map((bucket) => ({ ...bucket, base: round(bucket.base), tax: round(bucket.tax) }))
      .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)),
    invoiceIds: rows.map((row) => row.invoice.id),
    invoiceCount: rows.length,
    currency,
  };
}

export async function listDgiObligations(ctx: Context, input: { companyId: string }) {
  await assertCompanyAccess(ctx, input.companyId);
  return repo.listActiveDgiObligations(ctx.db);
}

export async function listFilings(
  ctx: Context,
  input: { companyId: string; status?: FilingStatus; limit?: number },
) {
  await assertCompanyAccess(ctx, input.companyId);
  return repo.listCompanyFilings(ctx.db, {
    companyId: input.companyId,
    status: input.status,
    limit: Math.min(input.limit ?? 100, 200),
  });
}

async function requireFiling(ctx: Context, companyId: string, filingId: string): Promise<Filing> {
  const filing = await repo.findFiling(ctx.db, companyId, filingId);
  if (!filing) {
    throw new ORPCError("NOT_FOUND", { message: "Filing not found" });
  }
  return filing;
}

export async function getFiling(ctx: Context, input: { companyId: string; filingId: string }) {
  await assertCompanyAccess(ctx, input.companyId);
  const filing = await requireFiling(ctx, input.companyId, input.filingId);
  const linked = await repo.listFilingInvoices(ctx.db, filing.id);
  return { filing, invoices: linked.map((row) => row.invoice) };
}

export async function previewFiling(
  ctx: Context,
  params: {
    companyId: string;
    periodStart: string;
    periodEnd: string;
    obligationId?: string;
  },
) {
  await assertCompanyAccess(ctx, params.companyId);
  const totals = await computeFilingTotals(ctx, {
    companyId: params.companyId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  });
  let obligation = null;
  if (params.obligationId) {
    obligation = await repo.findObligationById(ctx.db, params.obligationId);
  }
  return { totals, obligation };
}

export async function createFilingDraft(
  ctx: Context,
  input: {
    companyId: string;
    periodStart: string;
    periodEnd: string;
    obligationId?: string;
    taxType?: string;
  },
) {
  await assertCompanyAccess(ctx, input.companyId);

  let obligation = null;
  if (input.obligationId) {
    obligation = await repo.findObligationById(ctx.db, input.obligationId);
    if (!obligation) {
      throw new ORPCError("NOT_FOUND", { message: "Obligation not found" });
    }
  }

  const totals = await computeFilingTotals(ctx, {
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });

  const filing = await repo.insertFiling(ctx.db, {
    companyId: input.companyId,
    agencyId: obligation?.agencyId ?? "DGI",
    obligationId: obligation?.id ?? null,
    taxType: input.taxType ?? obligation?.code ?? "declaration_fiscale_mensuelle",
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    status: "draft",
    preparedByUserId: ctx.user?.id ?? null,
    totalTaxDue: toDecimal(totals.netTaxDue),
    payload: { totals, disclaimerKey: "filings.disclaimer" },
  });

  if (!filing) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create filing" });
  }

  await syncFilingInvoices(ctx, filing.id, totals.invoiceIds);

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "filing",
    entityId: filing.id,
    action: "filing.created",
    summary: `Filing draft created (${filing.periodStart} → ${filing.periodEnd})`,
    data: { netTaxDue: totals.netTaxDue, invoiceCount: totals.invoiceCount },
  });

  await notify(ctx, {
    userId: ctx.user?.id ?? "",
    companyId: input.companyId,
    type: "system",
    title: "Déclaration brouillon créée",
    body: `Période ${filing.periodStart} → ${filing.periodEnd}`,
    entityType: "filing",
    entityId: filing.id,
  });

  return { filing, totals };
}

async function syncFilingInvoices(
  ctx: Context,
  filingId: string,
  invoiceIds: string[],
): Promise<void> {
  await repo.deleteFilingInvoices(ctx.db, filingId);
  await repo.insertFilingInvoices(
    ctx.db,
    invoiceIds.map((invoiceId) => ({
      filingId,
      invoiceId,
      addedBy: ctx.user?.id ?? null,
    })),
  );
}

export async function recomputeFiling(
  ctx: Context,
  input: { companyId: string; filingId: string },
) {
  await assertCompanyAccess(ctx, input.companyId);
  const filing = await requireFiling(ctx, input.companyId, input.filingId);
  const totals = await computeFilingTotals(ctx, {
    companyId: filing.companyId,
    periodStart: filing.periodStart,
    periodEnd: filing.periodEnd,
  });

  const updated = await repo.updateFiling(ctx.db, filing.id, {
    payload: { totals, disclaimerKey: "filings.disclaimer" },
    totalTaxDue: toDecimal(totals.netTaxDue),
    status: filing.status === "under_review" ? "under_review" : "ready",
    updatedAt: new Date(),
  });

  await syncFilingInvoices(ctx, filing.id, totals.invoiceIds);

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "filing",
    entityId: filing.id,
    action: "filing.recomputed",
    summary: "Filing recomputed",
    data: { netTaxDue: totals.netTaxDue, invoiceCount: totals.invoiceCount },
  });

  return { filing: updated ?? filing, totals };
}

export async function updateFilingStatus(
  ctx: Context,
  input: { companyId: string; filingId: string; status: FilingStatus },
) {
  await assertCompanyAccess(ctx, input.companyId);
  const filing = await requireFiling(ctx, input.companyId, input.filingId);
  const updated = await repo.updateFiling(ctx.db, filing.id, {
    status: input.status,
    updatedAt: new Date(),
  });

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "filing",
    entityId: filing.id,
    action: "filing.status_changed",
    summary: `Filing status set to ${input.status}`,
  });

  return { filing: updated ?? filing };
}

export async function inviteAccountant(
  ctx: Context,
  input: { companyId: string; filingId?: string; email?: string; message?: string },
) {
  await assertCompanyAccess(ctx, input.companyId);

  const grants = await repo.listActiveCompanyGrantRecipients(ctx.db, input.companyId);
  const recipients = grants.filter((grant) => grant.userId !== ctx.user?.id);
  for (const recipient of recipients) {
    await notify(ctx, {
      userId: recipient.userId,
      companyId: input.companyId,
      type: "mention",
      title: "Préparation fiscale à revoir",
      body: input.message ?? "Un membre vous invite à revoir la préparation fiscale.",
      entityType: input.filingId ? "filing" : "company",
      entityId: input.filingId ?? input.companyId,
    });
  }

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: input.filingId ? "filing" : "company",
    entityId: input.filingId ?? input.companyId,
    action: "filing.accountant_invited",
    summary: `Accountant notified (${recipients.length})`,
    data: { email: input.email ?? null, recipients: recipients.length },
  });

  return { notified: recipients.length };
}

export async function removeFiling(ctx: Context, input: { companyId: string; filingId: string }) {
  await assertCompanyAccess(ctx, input.companyId);
  const filing = await requireFiling(ctx, input.companyId, input.filingId);
  await repo.deleteFiling(ctx.db, filing.id);
  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "filing",
    entityId: filing.id,
    action: "filing.removed",
    summary: "Filing removed",
  });
  return { removed: true };
}

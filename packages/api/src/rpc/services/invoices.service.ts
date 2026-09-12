import { ORPCError } from "@orpc/server";

import type { Invoice, NewFieldProvenance, NewInvoiceLine } from "@nationa/db";

import { assertCompanyAccess } from "../../auth/access";
import { invoiceSchema, type InvoiceOutput } from "../../domain/extraction";
import type { Context } from "../context";
import * as repo from "../repositories/invoices.repo";
import { recordActivity } from "./activity.service";
import { loadCurrentVersion, loadLatestExtraction, requireDocumentById } from "./documents.service";
import { normalizeDateToIso, runExtraction } from "./extraction.service";
import { notify } from "./notifications.service";

export type InvoiceDirection = "purchase" | "sale";
export type InvoiceStatus = "extracted" | "needs_review" | "verified";

export type InvoiceLineInput = {
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  lineTotal?: number | null;
};

export type InvoiceManualInput = {
  direction: InvoiceDirection;
  supplierName?: string | null;
  supplierTaxId?: string | null;
  invoiceNumber?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  total?: number | null;
  lines?: InvoiceLineInput[];
};

const INVOICE_PROVENANCE_KEYS = [
  "supplierName",
  "supplierTaxId",
  "invoiceNumber",
  "issueDate",
  "dueDate",
  "currency",
  "subtotal",
  "taxAmount",
  "total",
];

function toDecimal(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return value.toFixed(3);
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function normalizeLine(line: InvoiceLineInput) {
  const quantity = toNumber(line.quantity) ?? 0;
  const unitPrice = toNumber(line.unitPrice) ?? 0;
  const lineTotal = toNumber(line.lineTotal) ?? round(quantity * unitPrice);
  const taxRate = toNumber(line.taxRate);
  const taxAmount =
    toNumber(line.taxAmount) ?? (taxRate !== null ? round((lineTotal * taxRate) / 100) : 0);
  return {
    description: line.description ?? null,
    quantity,
    unitPrice,
    taxRate,
    taxAmount,
    lineTotal,
  };
}

function computeTotals(lines: InvoiceLineInput[]) {
  let subtotal = 0;
  let taxAmount = 0;
  for (const line of lines) {
    const normalized = normalizeLine(line);
    subtotal += normalized.lineTotal;
    taxAmount += normalized.taxAmount;
  }
  return {
    subtotal: round(subtotal),
    taxAmount: round(taxAmount),
    total: round(subtotal + taxAmount),
  };
}

async function requireCompany(ctx: Context, companyId: string) {
  const company = await repo.findCompanyById(ctx.db, companyId);
  if (!company) {
    throw new ORPCError("NOT_FOUND", { message: "Company not found" });
  }
  return company;
}

async function requireInvoice(
  ctx: Context,
  companyId: string,
  invoiceId: string,
): Promise<Invoice> {
  const invoice = await repo.findInvoiceById(ctx.db, companyId, invoiceId);
  if (!invoice) {
    throw new ORPCError("NOT_FOUND", { message: "Invoice not found" });
  }
  return invoice;
}

async function insertLines(
  ctx: Context,
  invoiceId: string,
  lines: InvoiceLineInput[],
): Promise<void> {
  if (lines.length === 0) {
    return;
  }
  const rows: NewInvoiceLine[] = lines.map((line, index) => {
    const normalized = normalizeLine(line);
    return {
      invoiceId,
      position: index + 1,
      description: normalized.description,
      quantity: toDecimal(normalized.quantity),
      unitPrice: toDecimal(normalized.unitPrice),
      taxRate: toDecimal(normalized.taxRate),
      taxAmount: toDecimal(normalized.taxAmount),
      lineTotal: toDecimal(normalized.lineTotal),
    };
  });
  await repo.insertInvoiceLines(ctx.db, rows);
}

async function writeProvenance(
  ctx: Context,
  input: {
    invoice: Invoice;
    sourceKind: "document" | "user" | "ai" | "system";
    sourceDocumentVersionId?: string | null;
    confidence?: number | null;
    fields?: string[];
  },
): Promise<void> {
  const keys = input.fields ?? INVOICE_PROVENANCE_KEYS;
  if (keys.length === 0) {
    return;
  }
  const confidence = toDecimal(input.confidence ?? null);
  const rows: NewFieldProvenance[] = keys.map((fieldKey) => ({
    subjectType: "invoice" as const,
    subjectId: input.invoice.id,
    fieldKey,
    sourceKind: input.sourceKind,
    sourceDocumentVersionId: input.sourceDocumentVersionId ?? null,
    confidence,
    enteredByUserId: ctx.user?.id ?? null,
  }));
  await repo.insertInvoiceProvenance(ctx.db, rows);
}

function directionFor(output: InvoiceOutput, companyTaxId: string | null): InvoiceDirection {
  if (output.supplierTaxId && companyTaxId && output.supplierTaxId === companyTaxId) {
    return "sale";
  }
  return "purchase";
}

function invoiceStatusFor(confidence: number | null): InvoiceStatus {
  if (confidence !== null && confidence < 0.6) {
    return "needs_review";
  }
  return "extracted";
}

export async function listInvoices(
  ctx: Context,
  input: {
    companyId: string;
    direction?: InvoiceDirection;
    status?: InvoiceStatus;
    from?: string;
    to?: string;
    limit?: number;
  },
) {
  await assertCompanyAccess(ctx, input.companyId);
  return repo.listInvoices(ctx.db, input);
}

export async function getInvoice(ctx: Context, input: { companyId: string; invoiceId: string }) {
  await assertCompanyAccess(ctx, input.companyId);
  const invoice = await requireInvoice(ctx, input.companyId, input.invoiceId);
  const lines = await repo.listInvoiceLines(ctx.db, invoice.id);
  const provenance = await repo.listInvoiceProvenance(ctx.db, invoice.id);
  return { invoice, lines, provenance };
}

export async function extractInvoiceFromDocument(
  ctx: Context,
  input: { companyId: string; documentId: string; documentVersionId?: string },
) {
  await assertCompanyAccess(ctx, input.companyId);
  const company = await requireCompany(ctx, input.companyId);
  const document = await requireDocumentById(ctx.db, input.documentId);
  if (document.companyId && document.companyId !== input.companyId) {
    throw new ORPCError("NOT_FOUND", { message: "Document not found" });
  }

  let version = null;
  if (input.documentVersionId) {
    version = await repo.findDocumentVersionById(ctx.db, input.documentVersionId);
  } else {
    version = await loadCurrentVersion(ctx.db, document);
  }
  if (!version) {
    throw new ORPCError("BAD_REQUEST", { message: "Document has no version to extract" });
  }

  let extraction = await loadLatestExtraction(ctx.db, version.id);
  const usable =
    extraction?.status === "succeeded" &&
    extraction.rawResult !== null &&
    extraction.rawResult !== undefined;
  if (!usable) {
    await runExtraction(ctx, {
      documentId: document.id,
      documentVersionId: version.id,
      kind: "invoice",
    });
    extraction = await loadLatestExtraction(ctx.db, version.id);
  }

  const parsed = invoiceSchema.safeParse(extraction?.rawResult);
  if (!parsed.success) {
    throw new ORPCError("BAD_REQUEST", {
      message: "The document extraction is not a valid invoice",
      data: { documentId: document.id },
    });
  }
  const output = parsed.data;
  const confidence = typeof output.confidence === "number" ? output.confidence : null;
  const direction = directionFor(output, company.taxId);
  const status = invoiceStatusFor(confidence);
  const lines = output.lines ?? [];
  const totals = computeTotals(lines);

  if (output.invoiceNumber) {
    const existing = await repo.findDuplicateInvoice(ctx.db, {
      companyId: input.companyId,
      direction,
      invoiceNumber: output.invoiceNumber,
    });
    if (existing) {
      return {
        invoice: existing,
        lines: await repo.listInvoiceLines(ctx.db, existing.id),
        duplicate: true,
      };
    }
  }

  const invoice = await repo.insertInvoice(ctx.db, {
    companyId: input.companyId,
    direction,
    supplierName: output.supplierName ?? null,
    supplierTaxId: output.supplierTaxId ?? null,
    invoiceNumber: output.invoiceNumber ?? null,
    issueDate: normalizeDateToIso(output.issueDate),
    dueDate: normalizeDateToIso(output.dueDate),
    currency: output.currency ?? company.currency ?? "TND",
    subtotal: toDecimal(output.subtotal ?? totals.subtotal),
    taxAmount: toDecimal(output.taxAmount ?? totals.taxAmount),
    total: toDecimal(output.total ?? totals.total) ?? "0.000",
    sourceDocumentVersionId: version.id,
    status,
  });

  if (!invoice) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create invoice" });
  }

  await insertLines(ctx, invoice.id, lines);
  await writeProvenance(ctx, {
    invoice,
    sourceKind: "document",
    sourceDocumentVersionId: version.id,
    confidence,
  });

  await notify(ctx, {
    userId: ctx.user?.id ?? "",
    companyId: input.companyId,
    type: "invoice_ready",
    title: output.invoiceNumber ? `Facture ${output.invoiceNumber} extraite` : "Facture extraite",
    body: output.supplierName ?? null,
    entityType: "invoice",
    entityId: invoice.id,
  });

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "ai",
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.extracted",
    summary: `Invoice extracted (${direction})`,
    data: { confidence, status, documentId: document.id },
  });

  return { invoice, lines: await repo.listInvoiceLines(ctx.db, invoice.id), duplicate: false };
}

export async function createManualInvoice(
  ctx: Context,
  input: InvoiceManualInput & { companyId: string },
) {
  await assertCompanyAccess(ctx, input.companyId);
  const lines = input.lines ?? [];
  const totals = computeTotals(lines);
  const invoice = await repo.insertInvoice(ctx.db, {
    companyId: input.companyId,
    direction: input.direction,
    supplierName: input.supplierName ?? null,
    supplierTaxId: input.supplierTaxId ?? null,
    invoiceNumber: input.invoiceNumber ?? null,
    issueDate: input.issueDate ?? null,
    dueDate: input.dueDate ?? null,
    currency: input.currency ?? "TND",
    subtotal: toDecimal(input.subtotal ?? totals.subtotal),
    taxAmount: toDecimal(input.taxAmount ?? totals.taxAmount),
    total: toDecimal(input.total ?? totals.total) ?? "0.000",
    status: "extracted",
  });

  if (!invoice) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create invoice" });
  }

  await insertLines(ctx, invoice.id, lines);
  await writeProvenance(ctx, { invoice, sourceKind: "user" });

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.created",
    summary: "Invoice created manually",
  });

  return { invoice, lines: await repo.listInvoiceLines(ctx.db, invoice.id) };
}

export async function updateInvoice(
  ctx: Context,
  input: {
    companyId: string;
    invoiceId: string;
    patch: Partial<InvoiceManualInput>;
    lines?: InvoiceLineInput[];
  },
) {
  await assertCompanyAccess(ctx, input.companyId);
  const current = await requireInvoice(ctx, input.companyId, input.invoiceId);
  const patch = input.patch;

  let totals: { subtotal: number; taxAmount: number; total: number } | null = null;
  if (input.lines) {
    await repo.deleteInvoiceLines(ctx.db, current.id);
    await insertLines(ctx, current.id, input.lines);
    totals = computeTotals(input.lines);
  }

  const updated = await repo.updateInvoice(ctx.db, current.id, {
    direction: patch.direction ?? current.direction,
    supplierName: patch.supplierName ?? current.supplierName,
    supplierTaxId: patch.supplierTaxId ?? current.supplierTaxId,
    invoiceNumber: patch.invoiceNumber ?? current.invoiceNumber,
    issueDate: patch.issueDate ?? current.issueDate,
    dueDate: patch.dueDate ?? current.dueDate,
    currency: patch.currency ?? current.currency,
    subtotal: toDecimal(patch.subtotal ?? totals?.subtotal ?? toNumber(current.subtotal)),
    taxAmount: toDecimal(patch.taxAmount ?? totals?.taxAmount ?? toNumber(current.taxAmount)),
    total: toDecimal(patch.total ?? totals?.total ?? toNumber(current.total)) ?? current.total,
    updatedAt: new Date(),
  });

  const invoice = updated ?? current;
  await writeProvenance(ctx, { invoice, sourceKind: "user" });

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.updated",
    summary: "Invoice updated",
    data: { linesUpdated: Boolean(input.lines) },
  });

  return { invoice, lines: await repo.listInvoiceLines(ctx.db, invoice.id) };
}

export async function verifyInvoice(ctx: Context, input: { companyId: string; invoiceId: string }) {
  await assertCompanyAccess(ctx, input.companyId);
  const current = await requireInvoice(ctx, input.companyId, input.invoiceId);
  const updated = await repo.updateInvoice(ctx.db, current.id, {
    status: "verified",
    updatedAt: new Date(),
  });

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "invoice",
    entityId: current.id,
    action: "invoice.verified",
    summary: "Invoice verified",
  });

  return { invoice: updated ?? current };
}

export async function removeInvoice(ctx: Context, input: { companyId: string; invoiceId: string }) {
  await assertCompanyAccess(ctx, input.companyId);
  const current = await requireInvoice(ctx, input.companyId, input.invoiceId);
  await repo.deleteInvoice(ctx.db, current.id);
  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "invoice",
    entityId: current.id,
    action: "invoice.removed",
    summary: "Invoice removed",
  });
  return { removed: true };
}

export async function listInvoicesForPeriod(
  ctx: Context,
  input: {
    companyId: string;
    periodStart: string;
    periodEnd: string;
    statuses?: InvoiceStatus[];
  },
) {
  await assertCompanyAccess(ctx, input.companyId);
  const statuses = input.statuses ?? ["verified"];
  const rows = await repo.listInvoicesForPeriod(ctx.db, {
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    statuses,
  });
  if (rows.length === 0) {
    return [];
  }
  const lines = await repo.listInvoiceLinesForInvoices(
    ctx.db,
    rows.map((row) => row.id),
  );
  return rows.map((invoice) => ({
    invoice,
    lines: lines.filter((line) => line.invoiceId === invoice.id),
  }));
}

export { INVOICE_PROVENANCE_KEYS };

import { and, asc, desc, eq, type SQL } from "drizzle-orm";

import {
  companyAccessGrants,
  filingInvoices,
  filings,
  invoices,
  obligations,
  type Filing,
  type NewFiling,
  type NewFilingInvoice,
} from "@nationa/db";

import type { Db } from "../context";

export async function listActiveDgiObligations(db: Db) {
  return db
    .select()
    .from(obligations)
    .where(and(eq(obligations.agencyId, "DGI"), eq(obligations.active, true)))
    .orderBy(asc(obligations.nameFr));
}

export async function listCompanyFilings(
  db: Db,
  input: { companyId: string; status?: Filing["status"]; limit: number },
) {
  const conditions: SQL[] = [eq(filings.companyId, input.companyId)];
  if (input.status) {
    conditions.push(eq(filings.status, input.status));
  }
  return db
    .select()
    .from(filings)
    .where(and(...conditions))
    .orderBy(desc(filings.periodStart), desc(filings.createdAt))
    .limit(input.limit);
}

export async function findFiling(
  db: Db,
  companyId: string,
  filingId: string,
): Promise<Filing | null> {
  const [row] = await db
    .select()
    .from(filings)
    .where(and(eq(filings.id, filingId), eq(filings.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export async function listFilingInvoices(db: Db, filingId: string) {
  return db
    .select({ invoice: invoices })
    .from(filingInvoices)
    .innerJoin(invoices, eq(invoices.id, filingInvoices.invoiceId))
    .where(eq(filingInvoices.filingId, filingId));
}

export async function findObligationById(db: Db, obligationId: string) {
  const [row] = await db
    .select()
    .from(obligations)
    .where(eq(obligations.id, obligationId))
    .limit(1);
  return row ?? null;
}

export async function insertFiling(db: Db, values: NewFiling): Promise<Filing | null> {
  const [row] = await db.insert(filings).values(values).returning();
  return row ?? null;
}

export async function updateFiling(
  db: Db,
  filingId: string,
  values: Partial<NewFiling>,
): Promise<Filing | null> {
  const [row] = await db.update(filings).set(values).where(eq(filings.id, filingId)).returning();
  return row ?? null;
}

export async function deleteFilingInvoices(db: Db, filingId: string): Promise<void> {
  await db.delete(filingInvoices).where(eq(filingInvoices.filingId, filingId));
}

export async function insertFilingInvoices(db: Db, values: NewFilingInvoice[]): Promise<void> {
  if (values.length === 0) {
    return;
  }
  await db.insert(filingInvoices).values(values);
}

export async function deleteFiling(db: Db, filingId: string): Promise<void> {
  await db.delete(filings).where(eq(filings.id, filingId));
}

export async function listActiveCompanyGrantRecipients(db: Db, companyId: string) {
  return db
    .select({ userId: companyAccessGrants.userId, role: companyAccessGrants.role })
    .from(companyAccessGrants)
    .where(
      and(eq(companyAccessGrants.companyId, companyId), eq(companyAccessGrants.status, "active")),
    );
}

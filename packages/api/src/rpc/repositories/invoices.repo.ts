import { and, asc, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";

import {
  companies,
  documentVersions,
  fieldProvenance,
  invoiceLines,
  invoices,
  type Company,
  type DocumentVersion,
  type FieldProvenance,
  type Invoice,
  type InvoiceLine,
  type NewFieldProvenance,
  type NewInvoice,
  type NewInvoiceLine,
} from "@nationa/db";

import type { Db } from "../context";

export async function findCompanyById(db: Db, companyId: string): Promise<Company | null> {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return company ?? null;
}

export async function findInvoiceById(
  db: Db,
  companyId: string,
  invoiceId: string,
): Promise<Invoice | null> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.companyId, companyId)))
    .limit(1);
  return invoice ?? null;
}

export async function findDocumentVersionById(
  db: Db,
  versionId: string,
): Promise<DocumentVersion | null> {
  const [version] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, versionId))
    .limit(1);
  return version ?? null;
}

export async function findDuplicateInvoice(
  db: Db,
  input: {
    companyId: string;
    direction: Invoice["direction"];
    invoiceNumber: string;
  },
): Promise<Invoice | null> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.companyId, input.companyId),
        eq(invoices.direction, input.direction),
        eq(invoices.invoiceNumber, input.invoiceNumber),
      ),
    )
    .limit(1);
  return invoice ?? null;
}

export async function listInvoices(
  db: Db,
  input: {
    companyId: string;
    direction?: Invoice["direction"];
    status?: Invoice["status"];
    from?: string;
    to?: string;
    limit?: number;
  },
): Promise<Invoice[]> {
  const conditions: SQL[] = [eq(invoices.companyId, input.companyId)];
  if (input.direction) {
    conditions.push(eq(invoices.direction, input.direction));
  }
  if (input.status) {
    conditions.push(eq(invoices.status, input.status));
  }
  if (input.from) {
    conditions.push(gte(invoices.issueDate, input.from));
  }
  if (input.to) {
    conditions.push(lte(invoices.issueDate, input.to));
  }
  return db
    .select()
    .from(invoices)
    .where(and(...conditions))
    .orderBy(desc(invoices.issueDate), desc(invoices.createdAt))
    .limit(Math.min(input.limit ?? 100, 200));
}

export async function listInvoiceLines(db: Db, invoiceId: string): Promise<InvoiceLine[]> {
  return db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId))
    .orderBy(asc(invoiceLines.position));
}

export async function listInvoiceLinesForInvoices(
  db: Db,
  invoiceIds: string[],
): Promise<InvoiceLine[]> {
  if (invoiceIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(invoiceLines)
    .where(inArray(invoiceLines.invoiceId, invoiceIds))
    .orderBy(asc(invoiceLines.position));
}

export async function listInvoicesForPeriod(
  db: Db,
  input: {
    companyId: string;
    periodStart: string;
    periodEnd: string;
    statuses: Invoice["status"][];
  },
): Promise<Invoice[]> {
  return db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.companyId, input.companyId),
        gte(invoices.issueDate, input.periodStart),
        lte(invoices.issueDate, input.periodEnd),
        inArray(invoices.status, input.statuses),
      ),
    )
    .orderBy(asc(invoices.issueDate));
}

export async function listInvoiceProvenance(db: Db, invoiceId: string): Promise<FieldProvenance[]> {
  return db
    .select()
    .from(fieldProvenance)
    .where(
      and(eq(fieldProvenance.subjectType, "invoice"), eq(fieldProvenance.subjectId, invoiceId)),
    )
    .orderBy(desc(fieldProvenance.createdAt));
}

export async function insertInvoice(db: Db, values: NewInvoice): Promise<Invoice | null> {
  const [invoice] = await db.insert(invoices).values(values).returning();
  return invoice ?? null;
}

export async function insertInvoiceLines(db: Db, rows: NewInvoiceLine[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(invoiceLines).values(rows);
}

export async function deleteInvoiceLines(db: Db, invoiceId: string): Promise<void> {
  await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
}

export async function updateInvoice(
  db: Db,
  invoiceId: string,
  values: Partial<NewInvoice>,
): Promise<Invoice | null> {
  const [invoice] = await db
    .update(invoices)
    .set(values)
    .where(eq(invoices.id, invoiceId))
    .returning();
  return invoice ?? null;
}

export async function deleteInvoice(db: Db, invoiceId: string): Promise<void> {
  await db.delete(invoices).where(eq(invoices.id, invoiceId));
}

export async function insertInvoiceProvenance(db: Db, rows: NewFieldProvenance[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(fieldProvenance).values(rows);
}

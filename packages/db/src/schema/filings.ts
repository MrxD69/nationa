import {
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { agencies } from "./agencies";
import { companies } from "./companies";
import { documents } from "./documents";
import { invoices } from "./invoices";
import { obligations } from "./obligations";
import type { JsonObject } from "./types";
import { users } from "./users";

export const filingStatusEnum = pgEnum("filing_status", [
  "draft",
  "ready",
  "under_review",
  "submitted",
  "approved",
  "rejected",
]);

export type FilingPayload = JsonObject;

export const filings = snakeCase.table.withRLS(
  "filings",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agencyId: text()
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    obligationId: uuid().references(() => obligations.id, { onDelete: "set null" }),
    taxType: text().notNull(),
    periodStart: date({ mode: "string" }).notNull(),
    periodEnd: date({ mode: "string" }).notNull(),
    status: filingStatusEnum().notNull().default("draft"),
    preparedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    reviewedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    totalTaxDue: numeric({ precision: 14, scale: 3 }),
    payload: jsonb().$type<FilingPayload>(),
    documentId: uuid().references(() => documents.id, { onDelete: "set null" }),
    submittedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("filings_company_status_period_idx").on(table.companyId, table.status, table.periodStart),
    index("filings_agency_status_idx").on(table.agencyId, table.status),
    index("filings_obligation_id_idx").on(table.obligationId),
    index("filings_prepared_by_idx").on(table.preparedByUserId),
    index("filings_reviewed_by_idx").on(table.reviewedByUserId),
    index("filings_document_id_idx").on(table.documentId),
  ],
);

export const filingInvoices = snakeCase.table.withRLS(
  "filing_invoices",
  {
    filingId: uuid()
      .notNull()
      .references(() => filings.id, { onDelete: "cascade" }),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    addedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.filingId, table.invoiceId] }),
    index("filing_invoices_invoice_id_idx").on(table.invoiceId),
    index("filing_invoices_added_by_idx").on(table.addedBy),
  ],
);

export type Filing = typeof filings.$inferSelect;
export type NewFiling = typeof filings.$inferInsert;
export type FilingInvoice = typeof filingInvoices.$inferSelect;
export type NewFilingInvoice = typeof filingInvoices.$inferInsert;

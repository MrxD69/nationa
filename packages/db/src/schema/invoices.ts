import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { companies } from "./companies";
import { documentVersions } from "./documents";

export const invoiceDirectionEnum = pgEnum("invoice_direction", ["purchase", "sale"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "extracted",
  "needs_review",
  "verified",
]);

export const invoices = snakeCase.table.withRLS(
  "invoices",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    direction: invoiceDirectionEnum().notNull(),
    supplierName: text(),
    supplierTaxId: text(),
    invoiceNumber: text(),
    issueDate: date({ mode: "string" }),
    dueDate: date({ mode: "string" }),
    currency: text().notNull().default("TND"),
    subtotal: numeric({ precision: 14, scale: 3 }),
    taxAmount: numeric({ precision: 14, scale: 3 }),
    total: numeric({ precision: 14, scale: 3 }).notNull(),
    sourceDocumentVersionId: uuid().references(() => documentVersions.id, { onDelete: "set null" }),
    status: invoiceStatusEnum().notNull().default("extracted"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("invoices_company_direction_supplier_number_uidx").on(
      table.companyId,
      table.direction,
      table.supplierTaxId,
      table.invoiceNumber,
    ),
    index("invoices_company_issue_date_idx").on(table.companyId, table.issueDate),
    index("invoices_company_status_idx").on(table.companyId, table.status),
    index("invoices_source_document_version_id_idx").on(table.sourceDocumentVersionId),
  ],
);

export const invoiceLines = snakeCase.table.withRLS(
  "invoice_lines",
  {
    id: uuid().primaryKey().defaultRandom(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    description: text(),
    quantity: numeric({ precision: 14, scale: 3 }),
    unitPrice: numeric({ precision: 14, scale: 3 }),
    taxRate: numeric({ precision: 5, scale: 2 }),
    taxAmount: numeric({ precision: 14, scale: 3 }),
    lineTotal: numeric({ precision: 14, scale: 3 }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("invoice_lines_invoice_position_uidx").on(table.invoiceId, table.position),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;

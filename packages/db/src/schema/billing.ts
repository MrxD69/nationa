import { index, numeric, pgEnum, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { cases } from "./cases";
import { companies } from "./companies";
import { documents } from "./documents";
import { fees } from "./fees";
import { users } from "./users";

export const feeChargeStatusEnum = pgEnum("fee_charge_status", [
  "quoted",
  "due",
  "paid",
  "waived",
  "refunded",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "processing",
  "failed",
  "completed",
  "refunded",
]);

export const feeCharges = snakeCase.table.withRLS(
  "fee_charges",
  {
    id: uuid().primaryKey().defaultRandom(),
    caseId: uuid().references(() => cases.id, { onDelete: "set null" }),
    feeId: uuid().references(() => fees.id, { onDelete: "set null" }),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    label: text().notNull(),
    amount: numeric({ precision: 12, scale: 3 }).notNull(),
    currency: text().notNull().default("TND"),
    status: feeChargeStatusEnum().notNull().default("quoted"),
    dueAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("fee_charges_company_status_due_idx").on(table.companyId, table.status, table.dueAt),
    index("fee_charges_case_id_idx").on(table.caseId),
    index("fee_charges_fee_id_idx").on(table.feeId),
  ],
);

export const payments = snakeCase.table.withRLS(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    chargeId: uuid()
      .notNull()
      .references(() => feeCharges.id, { onDelete: "restrict" }),
    payerUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    provider: text().notNull(),
    providerRef: text(),
    amount: numeric({ precision: 12, scale: 3 }).notNull(),
    currency: text().notNull().default("TND"),
    status: paymentStatusEnum().notNull().default("processing"),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("payments_charge_status_idx").on(table.chargeId, table.status),
    index("payments_provider_ref_idx").on(table.providerRef),
    index("payments_payer_user_id_idx").on(table.payerUserId),
  ],
);

export const receipts = snakeCase.table.withRLS(
  "receipts",
  {
    id: uuid().primaryKey().defaultRandom(),
    paymentId: uuid()
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    number: text().notNull(),
    issuedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    documentId: uuid().references(() => documents.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("receipts_number_uidx").on(table.number),
    index("receipts_payment_id_idx").on(table.paymentId),
    index("receipts_document_id_idx").on(table.documentId),
  ],
);

export type FeeCharge = typeof feeCharges.$inferSelect;
export type NewFeeCharge = typeof feeCharges.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;

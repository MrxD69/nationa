import { boolean, index, jsonb, numeric, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { agencies } from "./agencies";
import { obligations } from "./obligations";
import { procedureTemplates } from "./procedures";
import type { JsonObject } from "./types";

export type FeeLogic = JsonObject;

export const fees = snakeCase.table.withRLS(
  "fees",
  {
    id: uuid().primaryKey().defaultRandom(),
    agencyId: text()
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    procedureTemplateId: uuid().references(() => procedureTemplates.id, {
      onDelete: "set null",
    }),
    obligationId: uuid().references(() => obligations.id, { onDelete: "set null" }),
    label: text().notNull(),
    amount: numeric({ precision: 12, scale: 3 }).notNull(),
    currency: text().notNull().default("TND"),
    logic: jsonb().$type<FeeLogic>(),
    active: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("fees_agency_active_idx").on(table.agencyId, table.active),
    index("fees_procedure_template_id_idx").on(table.procedureTemplateId),
    index("fees_obligation_id_idx").on(table.obligationId),
  ],
);

export type Fee = typeof fees.$inferSelect;
export type NewFee = typeof fees.$inferInsert;

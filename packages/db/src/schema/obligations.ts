import {
  boolean,
  index,
  jsonb,
  pgEnum,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { agencies } from "./agencies";
import type { JsonObject } from "./types";

export const obligationPeriodicityEnum = pgEnum("obligation_periodicity", [
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "event_based",
  "one_off",
  "irregular",
]);

export type DeadlineRule = JsonObject;
export type AppliesTo = JsonObject;

export const obligations = snakeCase.table.withRLS(
  "obligations",
  {
    id: uuid().primaryKey().defaultRandom(),
    agencyId: text()
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    code: text().notNull(),
    nameFr: text().notNull(),
    nameAr: text(),
    description: text(),
    legalBasis: text(),
    periodicity: obligationPeriodicityEnum().notNull(),
    deadlineRule: jsonb().$type<DeadlineRule>(),
    penaltySummary: text(),
    appliesTo: jsonb().$type<AppliesTo>(),
    active: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("obligations_agency_code_uidx").on(table.agencyId, table.code),
    index("obligations_agency_active_idx").on(table.agencyId, table.active),
  ],
);

export type Obligation = typeof obligations.$inferSelect;
export type NewObligation = typeof obligations.$inferInsert;

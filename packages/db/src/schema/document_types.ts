import {
  boolean,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { agencies } from "./agencies";

export const documentTypes = snakeCase.table.withRLS(
  "document_types",
  {
    id: uuid().primaryKey().defaultRandom(),
    agencyId: text().references(() => agencies.id, { onDelete: "set null" }),
    code: text().notNull(),
    nameFr: text().notNull(),
    nameAr: text(),
    description: text(),
    acceptedMimeTypes: text().array().notNull().default([]),
    requiredFields: jsonb().$type<string[]>(),
    validityDays: integer(),
    active: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("document_types_agency_code_uidx").on(table.agencyId, table.code),
    index("document_types_code_idx").on(table.code),
  ],
);

export type DocumentType = typeof documentTypes.$inferSelect;
export type NewDocumentType = typeof documentTypes.$inferInsert;

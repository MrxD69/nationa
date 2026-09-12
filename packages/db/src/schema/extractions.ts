import { index, integer, jsonb, numeric, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { documentVersions } from "./documents";

export const extractionKindEnum = pgEnum("extraction_kind", ["ocr", "text", "llm_structured"]);
export const extractionStatusEnum = pgEnum("extraction_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export type Bbox = { x: number; y: number; width: number; height: number };

export const extractions = snakeCase.table.withRLS(
  "extractions",
  {
    id: uuid().primaryKey().defaultRandom(),
    documentVersionId: uuid()
      .notNull()
      .references(() => documentVersions.id, { onDelete: "cascade" }),
    kind: extractionKindEnum().notNull(),
    engine: text(),
    model: text(),
    status: extractionStatusEnum().notNull().default("queued"),
    rawResult: jsonb(),
    confidenceOverall: numeric({ precision: 5, scale: 2 }),
    error: text(),
    startedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("extractions_document_version_status_idx").on(table.documentVersionId, table.status),
    index("extractions_document_version_created_idx").on(table.documentVersionId, table.createdAt),
    index("extractions_status_idx").on(table.status),
  ],
);

export const extractedFields = snakeCase.table.withRLS(
  "extracted_fields",
  {
    id: uuid().primaryKey().defaultRandom(),
    extractionId: uuid()
      .notNull()
      .references(() => extractions.id, { onDelete: "cascade" }),
    key: text().notNull(),
    labelRaw: text(),
    normalizedKey: text(),
    valueText: text(),
    valueJsonb: jsonb(),
    confidence: numeric({ precision: 5, scale: 2 }),
    page: integer(),
    bbox: jsonb().$type<Bbox>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("extracted_fields_extraction_key_idx").on(table.extractionId, table.key),
    index("extracted_fields_extraction_normalized_key_idx").on(
      table.extractionId,
      table.normalizedKey,
    ),
  ],
);

export type Extraction = typeof extractions.$inferSelect;
export type NewExtraction = typeof extractions.$inferInsert;
export type ExtractedField = typeof extractedFields.$inferSelect;
export type NewExtractedField = typeof extractedFields.$inferInsert;

import { index, numeric, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { aiProposals } from "./ai";
import { documentVersions } from "./documents";
import { fieldSourceKindEnum } from "./enums";
import { extractedFields } from "./extractions";
import { users } from "./users";

export { fieldSourceKindEnum } from "./enums";

export const provenanceSubjectTypeEnum = pgEnum("provenance_subject_type", [
  "company",
  "person",
  "case_field",
  "submission",
  "invoice",
  "finding",
  "filing",
]);

export const fieldProvenance = snakeCase.table.withRLS(
  "field_provenance",
  {
    id: uuid().primaryKey().defaultRandom(),
    subjectType: provenanceSubjectTypeEnum().notNull(),
    subjectId: uuid().notNull(),
    fieldKey: text().notNull(),
    sourceKind: fieldSourceKindEnum().notNull(),
    sourceDocumentVersionId: uuid().references(() => documentVersions.id, { onDelete: "set null" }),
    extractionFieldId: uuid().references(() => extractedFields.id, { onDelete: "set null" }),
    aiProposalId: uuid().references(() => aiProposals.id, { onDelete: "set null" }),
    confidence: numeric({ precision: 5, scale: 2 }),
    enteredByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("field_provenance_subject_field_created_idx").on(
      table.subjectType,
      table.subjectId,
      table.fieldKey,
      table.createdAt,
    ),
    index("field_provenance_subject_created_idx").on(
      table.subjectType,
      table.subjectId,
      table.createdAt,
    ),
    index("field_provenance_source_document_version_id_idx").on(table.sourceDocumentVersionId),
    index("field_provenance_extraction_field_id_idx").on(table.extractionFieldId),
    index("field_provenance_ai_proposal_id_idx").on(table.aiProposalId),
  ],
);

export type FieldProvenance = typeof fieldProvenance.$inferSelect;
export type NewFieldProvenance = typeof fieldProvenance.$inferInsert;

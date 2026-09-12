import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { aiProposals } from "./ai";
import { companies } from "./companies";
import { documentVersions } from "./documents";
import { fieldSourceKindEnum } from "./enums";
import { extractedFields } from "./extractions";
import { persons } from "./persons";
import { procedureSteps, procedureTemplates } from "./procedures";
import type { JsonObject } from "./types";
import { users } from "./users";

export const caseStatusEnum = pgEnum("case_status", [
  "draft",
  "in_progress",
  "awaiting_user",
  "awaiting_review",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
]);
export const caseStepStatusEnum = pgEnum("case_step_status", [
  "locked",
  "available",
  "in_progress",
  "completed",
  "skipped",
]);

export type CaseContext = JsonObject;

export const cases = snakeCase.table.withRLS(
  "cases",
  {
    id: uuid().primaryKey().defaultRandom(),
    templateId: uuid()
      .notNull()
      .references(() => procedureTemplates.id, { onDelete: "restrict" }),
    companyId: uuid().references(() => companies.id, { onDelete: "set null" }),
    applicantPersonId: uuid().references(() => persons.id, { onDelete: "set null" }),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    assignedToUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    title: text().notNull(),
    status: caseStatusEnum().notNull().default("draft"),
    context: jsonb().$type<CaseContext>(),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("cases_company_status_updated_idx").on(table.companyId, table.status, table.updatedAt),
    index("cases_assigned_status_idx").on(table.assignedToUserId, table.status),
    index("cases_template_id_idx").on(table.templateId),
    index("cases_created_by_idx").on(table.createdByUserId),
    index("cases_applicant_person_id_idx").on(table.applicantPersonId),
  ],
);

export const caseSteps = snakeCase.table.withRLS(
  "case_steps",
  {
    id: uuid().primaryKey().defaultRandom(),
    caseId: uuid()
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    templateStepId: uuid().references(() => procedureSteps.id, { onDelete: "set null" }),
    position: integer().notNull(),
    status: caseStepStatusEnum().notNull().default("locked"),
    startedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    assignedToUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("case_steps_case_position_uidx").on(table.caseId, table.position),
    index("case_steps_case_status_idx").on(table.caseId, table.status),
    index("case_steps_assigned_to_idx").on(table.assignedToUserId),
  ],
);

export const caseFieldValues = snakeCase.table.withRLS(
  "case_field_values",
  {
    id: uuid().primaryKey().defaultRandom(),
    caseId: uuid()
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    stepId: uuid().references(() => caseSteps.id, { onDelete: "set null" }),
    fieldKey: text().notNull(),
    valueText: text(),
    valueJsonb: jsonb(),
    sourceKind: fieldSourceKindEnum().notNull().default("user"),
    sourceDocumentVersionId: uuid().references(() => documentVersions.id, { onDelete: "set null" }),
    extractionFieldId: uuid().references(() => extractedFields.id, { onDelete: "set null" }),
    aiProposalId: uuid().references(() => aiProposals.id, { onDelete: "set null" }),
    confidence: numeric({ precision: 5, scale: 2 }),
    enteredByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("case_field_values_case_field_key_uidx").on(table.caseId, table.fieldKey),
    index("case_field_values_case_step_idx").on(table.caseId, table.stepId),
    index("case_field_values_source_document_version_id_idx").on(table.sourceDocumentVersionId),
    index("case_field_values_extraction_field_id_idx").on(table.extractionFieldId),
    index("case_field_values_ai_proposal_id_idx").on(table.aiProposalId),
    index("case_field_values_entered_by_idx").on(table.enteredByUserId),
  ],
);

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type CaseStep = typeof caseSteps.$inferSelect;
export type NewCaseStep = typeof caseSteps.$inferInsert;
export type CaseFieldValue = typeof caseFieldValues.$inferSelect;
export type NewCaseFieldValue = typeof caseFieldValues.$inferInsert;

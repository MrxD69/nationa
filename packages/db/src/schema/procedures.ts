import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { agencies } from "./agencies";
import { documentTypes } from "./document_types";
import { obligations } from "./obligations";
import type { JsonObject } from "./types";

export const procedureStepTypeEnum = pgEnum("procedure_step_type", [
  "info",
  "form",
  "upload",
  "payment",
  "review",
  "submission",
]);

export type FormSchema = JsonObject;

export const procedureTemplates = snakeCase.table.withRLS(
  "procedure_templates",
  {
    id: uuid().primaryKey().defaultRandom(),
    agencyId: text()
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    obligationId: uuid().references(() => obligations.id, { onDelete: "set null" }),
    code: text().notNull(),
    nameFr: text().notNull(),
    nameAr: text(),
    description: text(),
    category: text(),
    estimatedDays: integer(),
    active: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("procedure_templates_agency_code_uidx").on(table.agencyId, table.code),
    index("procedure_templates_obligation_id_idx").on(table.obligationId),
  ],
);

export const procedureSteps = snakeCase.table.withRLS(
  "procedure_steps",
  {
    id: uuid().primaryKey().defaultRandom(),
    templateId: uuid()
      .notNull()
      .references(() => procedureTemplates.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    code: text().notNull(),
    titleFr: text().notNull(),
    titleAr: text(),
    description: text(),
    stepType: procedureStepTypeEnum().notNull(),
    requiredDocumentTypeId: uuid().references(() => documentTypes.id, { onDelete: "set null" }),
    formSchema: jsonb().$type<FormSchema>(),
    isOptional: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("procedure_steps_template_position_uidx").on(table.templateId, table.position),
    uniqueIndex("procedure_steps_template_code_uidx").on(table.templateId, table.code),
    index("procedure_steps_required_document_type_id_idx").on(table.requiredDocumentTypeId),
  ],
);

export type ProcedureTemplate = typeof procedureTemplates.$inferSelect;
export type NewProcedureTemplate = typeof procedureTemplates.$inferInsert;
export type ProcedureStep = typeof procedureSteps.$inferSelect;
export type NewProcedureStep = typeof procedureSteps.$inferInsert;

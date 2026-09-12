import { index, jsonb, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import type { JsonObject } from "./types";
import { users } from "./users";

export const checkSubjectTypeEnum = pgEnum("check_subject_type", [
  "case",
  "submission",
  "company",
  "document",
]);
export const checkRunStatusEnum = pgEnum("check_run_status", [
  "queued",
  "running",
  "passed",
  "failed",
  "error",
]);
export const findingSeverityEnum = pgEnum("finding_severity", [
  "info",
  "warning",
  "error",
  "blocker",
]);
export const findingStatusEnum = pgEnum("finding_status", [
  "open",
  "resolved",
  "waived",
  "acknowledged",
]);
export const findingNoteKindEnum = pgEnum("finding_note_kind", ["note", "explanation"]);

export type CheckSummary = JsonObject;
export type ComparedRefs = JsonObject;

export const checkRuns = snakeCase.table.withRLS(
  "check_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    subjectType: checkSubjectTypeEnum().notNull(),
    subjectId: uuid().notNull(),
    ruleSetVersion: text().notNull(),
    status: checkRunStatusEnum().notNull().default("queued"),
    summary: jsonb().$type<CheckSummary>(),
    startedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("check_runs_subject_status_created_idx").on(
      table.subjectType,
      table.subjectId,
      table.status,
      table.createdAt,
    ),
    index("check_runs_subject_created_idx").on(table.subjectType, table.subjectId, table.createdAt),
    index("check_runs_status_idx").on(table.status),
  ],
);

export const findings = snakeCase.table.withRLS(
  "findings",
  {
    id: uuid().primaryKey().defaultRandom(),
    checkRunId: uuid()
      .notNull()
      .references(() => checkRuns.id, { onDelete: "cascade" }),
    severity: findingSeverityEnum().notNull(),
    code: text().notNull(),
    title: text().notNull(),
    messagePlain: text().notNull(),
    comparedRefs: jsonb().$type<ComparedRefs>(),
    suggestedFix: text(),
    status: findingStatusEnum().notNull().default("open"),
    resolvedAt: timestamp({ withTimezone: true }),
    resolvedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("findings_check_run_severity_idx").on(table.checkRunId, table.severity),
    index("findings_status_idx").on(table.status),
    index("findings_code_idx").on(table.code),
  ],
);

export const findingNotes = snakeCase.table.withRLS(
  "finding_notes",
  {
    id: uuid().primaryKey().defaultRandom(),
    findingId: uuid()
      .notNull()
      .references(() => findings.id, { onDelete: "cascade" }),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    kind: findingNoteKindEnum().notNull().default("note"),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("finding_notes_finding_created_idx").on(table.findingId, table.createdAt),
    index("finding_notes_user_id_idx").on(table.userId),
  ],
);

export type CheckRun = typeof checkRuns.$inferSelect;
export type NewCheckRun = typeof checkRuns.$inferInsert;
export type Finding = typeof findings.$inferSelect;
export type NewFinding = typeof findings.$inferInsert;
export type FindingNote = typeof findingNotes.$inferSelect;
export type NewFindingNote = typeof findingNotes.$inferInsert;

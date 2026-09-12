import {
  index,
  jsonb,
  numeric,
  pgEnum,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { agencies } from "./agencies";
import { cases } from "./cases";
import { companies } from "./companies";
import { documentVersions } from "./documents";
import { users } from "./users";

export const submissionStatusEnum = pgEnum("submission_status", [
  "draft",
  "queued",
  "in_review",
  "approved",
  "rejected",
  "returned",
  "escalated",
]);
export const cleanlinessTierEnum = pgEnum("cleanliness_tier", [
  "clean",
  "minor_concern",
  "needs_review",
]);
export const reviewDecisionEnum = pgEnum("review_decision", [
  "approve",
  "reject",
  "return_for_correction",
  "escalate",
]);

export type SubmissionSnapshot = Record<string, unknown>;

export const submissions = snakeCase.table.withRLS(
  "submissions",
  {
    id: uuid().primaryKey().defaultRandom(),
    caseId: uuid().references(() => cases.id, { onDelete: "set null" }),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    agencyId: text()
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    submittedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    status: submissionStatusEnum().notNull().default("draft"),
    snapshot: jsonb().$type<SubmissionSnapshot>(),
    cleanlinessTier: cleanlinessTierEnum().notNull().default("needs_review"),
    cleanlinessScore: numeric({ precision: 5, scale: 2 }),
    submittedAt: timestamp({ withTimezone: true }),
    decidedAt: timestamp({ withTimezone: true }),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("submissions_agency_status_cleanliness_idx").on(
      table.agencyId,
      table.status,
      table.cleanlinessTier,
      table.cleanlinessScore,
    ),
    index("submissions_company_status_created_idx").on(
      table.companyId,
      table.status,
      table.createdAt,
    ),
    index("submissions_case_id_idx").on(table.caseId),
    index("submissions_submitted_by_idx").on(table.submittedByUserId),
    index("submissions_status_submitted_idx").on(table.status, table.submittedAt),
  ],
);

export const reviews = snakeCase.table.withRLS(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    submissionId: uuid()
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    officerUserId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    decision: reviewDecisionEnum().notNull(),
    reason: text(),
    notes: text(),
    decidedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reviews_submission_decided_idx").on(table.submissionId, table.decidedAt),
    index("reviews_officer_decided_idx").on(table.officerUserId, table.decidedAt),
  ],
);

export const submissionDocuments = snakeCase.table.withRLS(
  "submission_documents",
  {
    submissionId: uuid()
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    documentVersionId: uuid()
      .notNull()
      .references(() => documentVersions.id, { onDelete: "cascade" }),
    addedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.submissionId, table.documentVersionId] }),
    index("submission_documents_document_version_id_idx").on(table.documentVersionId),
    index("submission_documents_added_by_idx").on(table.addedBy),
  ],
);

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type SubmissionDocument = typeof submissionDocuments.$inferSelect;
export type NewSubmissionDocument = typeof submissionDocuments.$inferInsert;

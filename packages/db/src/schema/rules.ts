import { date, index, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { obligations } from "./obligations";
import { procedureSteps } from "./procedures";
import { users } from "./users";

export const ruleCitations = snakeCase.table.withRLS(
  "rule_citations",
  {
    id: uuid().primaryKey().defaultRandom(),
    source: text().notNull(),
    article: text(),
    titleFr: text(),
    titleAr: text(),
    textFr: text(),
    textAr: text(),
    url: text(),
    effectiveFrom: date({ mode: "string" }),
    effectiveTo: date({ mode: "string" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rule_citations_source_article_idx").on(table.source, table.article)],
);

export const obligationCitations = snakeCase.table.withRLS(
  "obligation_citations",
  {
    obligationId: uuid()
      .notNull()
      .references(() => obligations.id, { onDelete: "cascade" }),
    ruleCitationId: uuid()
      .notNull()
      .references(() => ruleCitations.id, { onDelete: "cascade" }),
    addedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.obligationId, table.ruleCitationId] }),
    index("obligation_citations_rule_citation_id_idx").on(table.ruleCitationId),
    index("obligation_citations_added_by_idx").on(table.addedBy),
  ],
);

export const procedureStepCitations = snakeCase.table.withRLS(
  "procedure_step_citations",
  {
    stepId: uuid()
      .notNull()
      .references(() => procedureSteps.id, { onDelete: "cascade" }),
    ruleCitationId: uuid()
      .notNull()
      .references(() => ruleCitations.id, { onDelete: "cascade" }),
    addedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.stepId, table.ruleCitationId] }),
    index("procedure_step_citations_rule_citation_id_idx").on(table.ruleCitationId),
    index("procedure_step_citations_added_by_idx").on(table.addedBy),
  ],
);

export type RuleCitation = typeof ruleCitations.$inferSelect;
export type NewRuleCitation = typeof ruleCitations.$inferInsert;
export type ObligationCitation = typeof obligationCitations.$inferSelect;
export type NewObligationCitation = typeof obligationCitations.$inferInsert;
export type ProcedureStepCitation = typeof procedureStepCitations.$inferSelect;
export type NewProcedureStepCitation = typeof procedureStepCitations.$inferInsert;

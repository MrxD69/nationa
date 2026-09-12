import { index, jsonb, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { cases } from "./cases";
import { companies } from "./companies";
import { ruleCitations } from "./rules";
import type { AiPart, JsonObject } from "./types";
import { users } from "./users";

export const aiMessageRoleEnum = pgEnum("ai_message_role", ["user", "assistant", "system", "tool"]);
export const aiProposalStatusEnum = pgEnum("ai_proposal_status", [
  "draft",
  "accepted",
  "rejected",
  "superseded",
]);
export const aiProposalSubjectEnum = pgEnum("ai_proposal_subject_type", [
  "case",
  "company",
  "submission",
  "finding",
  "filing",
  "field",
]);

export type AiMessageMetadata = JsonObject;
export type AiProposalPayload = JsonObject;

export const aiConversations = snakeCase.table.withRLS(
  "ai_conversations",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid().references(() => companies.id, { onDelete: "set null" }),
    caseId: uuid().references(() => cases.id, { onDelete: "set null" }),
    title: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("ai_conversations_user_updated_idx").on(table.userId, table.updatedAt),
    index("ai_conversations_company_id_idx").on(table.companyId),
    index("ai_conversations_case_id_idx").on(table.caseId),
  ],
);

export const aiMessages = snakeCase.table.withRLS(
  "ai_messages",
  {
    id: text().primaryKey(),
    conversationId: uuid()
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: aiMessageRoleEnum().notNull(),
    content: text().notNull(),
    parts: jsonb().$type<AiPart[]>().notNull().default([]),
    metadata: jsonb().$type<AiMessageMetadata>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
  ],
);

export const aiProposals = snakeCase.table.withRLS(
  "ai_proposals",
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid().references(() => aiConversations.id, { onDelete: "set null" }),
    messageId: text().references(() => aiMessages.id, { onDelete: "set null" }),
    subjectType: aiProposalSubjectEnum().notNull(),
    subjectId: uuid().notNull(),
    kind: text().notNull(),
    status: aiProposalStatusEnum().notNull().default("draft"),
    payload: jsonb().$type<AiProposalPayload>(),
    rationale: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_proposals_conversation_created_idx").on(table.conversationId, table.createdAt),
    index("ai_proposals_subject_idx").on(table.subjectType, table.subjectId),
    index("ai_proposals_status_idx").on(table.status),
    index("ai_proposals_message_id_idx").on(table.messageId),
  ],
);

export const aiCitations = snakeCase.table.withRLS(
  "ai_citations",
  {
    id: uuid().primaryKey().defaultRandom(),
    proposalId: uuid().references(() => aiProposals.id, { onDelete: "cascade" }),
    messageId: text().references(() => aiMessages.id, { onDelete: "cascade" }),
    ruleCitationId: uuid()
      .notNull()
      .references(() => ruleCitations.id, { onDelete: "restrict" }),
    snippet: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_citations_proposal_id_idx").on(table.proposalId),
    index("ai_citations_message_id_idx").on(table.messageId),
    index("ai_citations_rule_citation_id_idx").on(table.ruleCitationId),
  ],
);

export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;
export type AiProposal = typeof aiProposals.$inferSelect;
export type NewAiProposal = typeof aiProposals.$inferInsert;
export type AiCitation = typeof aiCitations.$inferSelect;
export type NewAiCitation = typeof aiCitations.$inferInsert;

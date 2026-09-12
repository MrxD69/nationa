import { and, desc, eq, inArray, ne } from "drizzle-orm";

import {
  activityEvents,
  aiCitations,
  aiConversations,
  aiMessages,
  aiProposals,
  filings,
  type AiCitation,
  type AiConversation,
  type AiMessage,
  type AiProposal,
  type NewActivityEvent,
  type NewAiCitation,
  type NewAiConversation,
  type NewAiMessage,
  type NewAiProposal,
} from "@nationa/db";

import type { Db } from "../context";

export async function findConversationById(
  db: Db,
  conversationId: string,
): Promise<AiConversation | null> {
  const [row] = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.id, conversationId))
    .limit(1);
  return row ?? null;
}

export async function insertConversation(
  db: Db,
  values: NewAiConversation,
): Promise<AiConversation | null> {
  const [row] = await db.insert(aiConversations).values(values).returning();
  return row ?? null;
}

export async function updateConversationById(
  db: Db,
  conversationId: string,
  columns: Partial<NewAiConversation>,
): Promise<AiConversation | null> {
  const [row] = await db
    .update(aiConversations)
    .set(columns)
    .where(eq(aiConversations.id, conversationId))
    .returning();
  return row ?? null;
}

export async function touchConversation(
  db: Db,
  conversationId: string,
  updatedAt: Date,
): Promise<void> {
  await db.update(aiConversations).set({ updatedAt }).where(eq(aiConversations.id, conversationId));
}

export async function listConversationsForUser(
  db: Db,
  filter: { userId: string; companyId?: string; limit: number },
): Promise<AiConversation[]> {
  const conditions = [eq(aiConversations.userId, filter.userId)];
  if (filter.companyId) {
    conditions.push(eq(aiConversations.companyId, filter.companyId));
  }
  return db
    .select()
    .from(aiConversations)
    .where(and(...conditions))
    .orderBy(desc(aiConversations.updatedAt))
    .limit(filter.limit);
}

export async function deleteConversationById(db: Db, conversationId: string): Promise<void> {
  await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));
}

export async function insertMessageIfAbsent(db: Db, values: NewAiMessage): Promise<void> {
  await db.insert(aiMessages).values(values).onConflictDoNothing();
}

export async function upsertAssistantMessage(db: Db, values: NewAiMessage): Promise<void> {
  await db
    .insert(aiMessages)
    .values(values)
    .onConflictDoUpdate({
      target: aiMessages.id,
      set: {
        content: values.content,
        parts: values.parts,
        metadata: values.metadata,
      },
    });
}

export async function listMessagesByConversation(
  db: Db,
  conversationId: string,
): Promise<AiMessage[]> {
  return db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(aiMessages.createdAt);
}

export async function findProposalById(db: Db, proposalId: string): Promise<AiProposal | null> {
  const [row] = await db.select().from(aiProposals).where(eq(aiProposals.id, proposalId)).limit(1);
  return row ?? null;
}

export async function insertProposal(db: Db, values: NewAiProposal): Promise<AiProposal | null> {
  const [row] = await db.insert(aiProposals).values(values).returning();
  return row ?? null;
}

export async function updateProposalStatus(
  db: Db,
  proposalId: string,
  status: AiProposal["status"],
): Promise<AiProposal | null> {
  const [row] = await db
    .update(aiProposals)
    .set({ status })
    .where(eq(aiProposals.id, proposalId))
    .returning();
  return row ?? null;
}

export async function supersedeDraftProposals(
  db: Db,
  filter: {
    subjectType: AiProposal["subjectType"];
    subjectId: string;
    kind: string;
    exceptId: string;
  },
): Promise<void> {
  await db
    .update(aiProposals)
    .set({ status: "superseded" })
    .where(
      and(
        eq(aiProposals.subjectType, filter.subjectType),
        eq(aiProposals.subjectId, filter.subjectId),
        eq(aiProposals.kind, filter.kind),
        eq(aiProposals.status, "draft"),
        ne(aiProposals.id, filter.exceptId),
      ),
    );
}

export async function listProposalsByConversation(
  db: Db,
  conversationId: string,
): Promise<AiProposal[]> {
  return db
    .select()
    .from(aiProposals)
    .where(eq(aiProposals.conversationId, conversationId))
    .orderBy(desc(aiProposals.createdAt));
}

export async function insertAiCitation(db: Db, values: NewAiCitation): Promise<void> {
  await db.insert(aiCitations).values(values).onConflictDoNothing();
}

export async function listCitationsByMessageId(db: Db, messageId: string): Promise<AiCitation[]> {
  return db.select().from(aiCitations).where(eq(aiCitations.messageId, messageId));
}

export async function listCitationsByMessageIds(
  db: Db,
  messageIds: string[],
): Promise<AiCitation[]> {
  if (messageIds.length === 0) {
    return [];
  }
  return db.select().from(aiCitations).where(inArray(aiCitations.messageId, messageIds));
}

export async function findFilingCompanyId(db: Db, filingId: string): Promise<string | null> {
  const [row] = await db
    .select({ companyId: filings.companyId })
    .from(filings)
    .where(eq(filings.id, filingId))
    .limit(1);
  return row?.companyId ?? null;
}

export async function insertAiActivityEvent(db: Db, values: NewActivityEvent): Promise<void> {
  await db.insert(activityEvents).values(values);
}

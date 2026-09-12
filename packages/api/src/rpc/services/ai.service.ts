import { ORPCError } from "@orpc/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import type { AiConversation, AiPart, AiProposal, JsonObject } from "@nationa/db";

import { buildSystemPrompt, resolveAssistantLocale } from "../../ai/prompt";
import type { AssistantRequestBody } from "../../ai/types";
import { assertCompanyAccess, assertCompanyPermission, requireUser } from "../../auth/access";
import { applyCaseFields } from "../../services/cases";
import type { Context } from "../context";
import {
  deleteConversationById,
  findConversationById,
  findFilingCompanyId,
  findProposalById,
  insertConversation,
  insertMessageIfAbsent,
  listCitationsByMessageId,
  listCitationsByMessageIds,
  listConversationsForUser,
  listMessagesByConversation,
  listProposalsByConversation,
  supersedeDraftProposals,
  touchConversation,
  updateConversationById,
  updateProposalStatus,
  upsertAssistantMessage,
} from "../repositories/ai.repo";
import {
  getAccessibleCompanyIds,
  listRuleCitationsByIds,
  loadCaseCompanyId,
} from "../repositories/knowledge.repo";
import { recordActivity } from "./activity.service";
import { createAssistantTools } from "./assistant-tools.service";

const TITLE_MAX = 80;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function toCanonicalParts(parts: unknown): AiPart[] {
  if (!Array.isArray(parts)) {
    return [];
  }
  const out: AiPart[] = [];
  for (const raw of parts) {
    const part = asRecord(raw);
    if (!part) {
      continue;
    }
    const type = typeof part.type === "string" ? part.type : "";
    if (type === "text" && typeof part.text === "string") {
      out.push({ type: "text", text: part.text });
      continue;
    }
    if (type.startsWith("tool-") || type === "dynamic-tool") {
      const toolName =
        type === "dynamic-tool" ? String(part.toolName ?? "tool") : type.slice("tool-".length);
      out.push({
        type: "tool",
        toolName,
        toolCallId: typeof part.toolCallId === "string" ? part.toolCallId : "",
        args: asRecord(part.input) ?? {},
        result: part.output,
      });
      continue;
    }
    if (type === "data-citation") {
      const data = asRecord(part.data) ?? {};
      if (typeof data.ruleCitationId === "string") {
        out.push({
          type: "citation",
          ruleCitationId: data.ruleCitationId,
          snippet: typeof data.snippet === "string" ? data.snippet : undefined,
        });
      }
    }
  }
  return out;
}

function extractText(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return "";
  }
  const chunks: string[] = [];
  for (const raw of parts) {
    const part = asRecord(raw);
    if (part && part.type === "text" && typeof part.text === "string") {
      chunks.push(part.text);
    }
  }
  return chunks.join("\n\n").trim();
}

function truncateTitle(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) {
    return "Nouvelle conversation";
  }
  return trimmed.length > TITLE_MAX ? `${trimmed.slice(0, TITLE_MAX - 1)}…` : trimmed;
}

async function resolveConversation(
  ctx: Context,
  userId: string,
  body: AssistantRequestBody,
  fallbackTitle: string,
): Promise<AiConversation> {
  const requestedId = typeof body.conversationId === "string" ? body.conversationId : null;
  if (requestedId) {
    const existing = await findConversationById(ctx.db, requestedId);
    if (existing && existing.userId === userId) {
      const companyId = body.companyId ?? existing.companyId;
      const caseId = body.caseId ?? existing.caseId;
      const needsTitle = !existing.title && fallbackTitle.trim().length > 0;
      if (companyId !== existing.companyId || caseId !== existing.caseId || needsTitle) {
        const updated = await updateConversationById(ctx.db, existing.id, {
          companyId: companyId ?? null,
          caseId: caseId ?? null,
          ...(needsTitle ? { title: truncateTitle(fallbackTitle) } : {}),
        });
        return updated ?? existing;
      }
      return existing;
    }
  }

  const created = await insertConversation(ctx.db, {
    userId,
    companyId: body.companyId ?? null,
    caseId: body.caseId ?? null,
    title: truncateTitle(fallbackTitle),
  });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create conversation" });
  }

  await recordActivity(ctx, {
    companyId: created.companyId,
    actorUserId: userId,
    actorType: "user",
    entityType: "ai_conversation",
    entityId: created.id,
    action: "ai.conversation_started",
    summary: created.title ?? null,
  });

  return created;
}

async function persistAssistantMessage(
  ctx: Context,
  input: {
    conversationId: string;
    companyId: string | null;
    messageId: string;
    responseMessage: UIMessage;
  },
): Promise<void> {
  const content = extractText(input.responseMessage.parts);
  const parts = toCanonicalParts(input.responseMessage.parts);

  const citationRows = await listCitationsByMessageId(ctx.db, input.messageId);
  for (const citation of citationRows) {
    parts.push({
      type: "citation",
      ruleCitationId: citation.ruleCitationId,
      snippet: citation.snippet ?? undefined,
    });
  }

  await upsertAssistantMessage(ctx.db, {
    id: input.messageId,
    conversationId: input.conversationId,
    role: "assistant",
    content,
    parts,
    metadata: { uiParts: input.responseMessage.parts as unknown as JsonObject },
  });

  await touchConversation(ctx.db, input.conversationId, new Date());

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "ai",
    entityType: "ai_conversation",
    entityId: input.conversationId,
    action: "ai.message_completed",
    summary: content.slice(0, 140) || null,
  });
}

export async function streamAssistantResponse(ctx: Context, rawBody: unknown): Promise<Response> {
  const user = requireUser(ctx);
  const body = (rawBody ?? {}) as AssistantRequestBody;

  if (typeof body.companyId === "string" && body.companyId.length > 0) {
    await assertCompanyPermission(ctx, body.companyId, "ai.use");
  }

  const uiMessages = Array.isArray(body.messages) ? (body.messages as UIMessage[]) : [];
  const locale = resolveAssistantLocale(body.locale);

  const lastUser = [...uiMessages].reverse().find((message) => message.role === "user");
  const userText = lastUser ? extractText(lastUser.parts) : "";

  const conversation = await resolveConversation(ctx, user.id, body, userText);

  if (lastUser) {
    await insertMessageIfAbsent(ctx.db, {
      id: lastUser.id,
      conversationId: conversation.id,
      role: "user",
      content: userText,
      parts: toCanonicalParts(lastUser.parts),
      metadata: { uiParts: lastUser.parts as unknown as JsonObject },
    });
  }

  const accessibleCompanyIds = await getAccessibleCompanyIds(ctx.db, user.id);
  const companyId = body.companyId ?? conversation.companyId ?? null;
  const caseId = body.caseId ?? conversation.caseId ?? null;
  const assistantMessageId = generateId();

  await insertMessageIfAbsent(ctx.db, {
    id: assistantMessageId,
    conversationId: conversation.id,
    role: "assistant",
    content: "",
    parts: [],
  });

  const tools = createAssistantTools({
    ctx,
    userId: user.id,
    conversationId: conversation.id,
    messageId: assistantMessageId,
    companyId,
    caseId,
    accessibleCompanyIds,
    locale,
  });

  const system = buildSystemPrompt({ locale, companyId, caseId, accessibleCompanyIds });
  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: ctx.ai.model,
    system,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(8),
  });

  const stream = toUIMessageStream({
    stream: result.stream,
    tools,
    originalMessages: uiMessages,
    sendSources: true,
    generateMessageId: () => assistantMessageId,
    onEnd: async ({ responseMessage }) => {
      await persistAssistantMessage(ctx, {
        conversationId: conversation.id,
        companyId: conversation.companyId ?? null,
        messageId: assistantMessageId,
        responseMessage,
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

async function loadCitationsForMessages(ctx: Context, messageIds: string[]) {
  if (messageIds.length === 0) {
    return [];
  }
  const citations = await listCitationsByMessageIds(ctx.db, messageIds);
  const ruleIds = [...new Set(citations.map((citation) => citation.ruleCitationId))];
  const rules = await listRuleCitationsByIds(ctx.db, ruleIds);
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  return citations.map((citation) => {
    const rule = rulesById.get(citation.ruleCitationId);
    return {
      id: citation.id,
      messageId: citation.messageId,
      proposalId: citation.proposalId,
      snippet: citation.snippet,
      rule: rule
        ? {
            id: rule.id,
            source: rule.source,
            article: rule.article,
            titleFr: rule.titleFr,
            titleAr: rule.titleAr,
            textFr: rule.textFr,
            textAr: rule.textAr,
            url: rule.url,
          }
        : null,
    };
  });
}

export async function listConversations(
  ctx: Context,
  input: { companyId?: string; limit?: number },
) {
  const user = requireUser(ctx);
  if (input.companyId) {
    await assertCompanyAccess(ctx, input.companyId);
  }
  return listConversationsForUser(ctx.db, {
    userId: user.id,
    companyId: input.companyId,
    limit: input.limit ?? 50,
  });
}

export async function createConversation(
  ctx: Context,
  input: { companyId?: string; caseId?: string; title?: string },
) {
  const user = requireUser(ctx);
  if (input.companyId) {
    await assertCompanyAccess(ctx, input.companyId);
  }
  const conversation = await insertConversation(ctx.db, {
    userId: user.id,
    companyId: input.companyId ?? null,
    caseId: input.caseId ?? null,
    title: input.title ? truncateTitle(input.title) : null,
  });
  if (!conversation) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create conversation" });
  }
  return conversation;
}

export async function getConversation(ctx: Context, input: { conversationId: string }) {
  const user = requireUser(ctx);
  const conversation = await findConversationById(ctx.db, input.conversationId);
  if (!conversation || conversation.userId !== user.id) {
    throw new ORPCError("NOT_FOUND", { message: "Conversation not found" });
  }

  const messages = await listMessagesByConversation(ctx.db, conversation.id);

  const citations = await loadCitationsForMessages(
    ctx,
    messages.map((message) => message.id),
  );

  const proposals = await listProposalsByConversation(ctx.db, conversation.id);

  return {
    conversation,
    messages: messages.map((message) => {
      const metadata = asRecord(message.metadata);
      const uiParts = metadata?.uiParts;
      return {
        id: message.id,
        role: message.role,
        content: message.content,
        parts: uiParts ?? message.parts,
        createdAt: message.createdAt,
      };
    }),
    citations,
    proposals,
  };
}

export async function deleteConversation(ctx: Context, input: { conversationId: string }) {
  const user = requireUser(ctx);
  const conversation = await findConversationById(ctx.db, input.conversationId);
  if (!conversation || conversation.userId !== user.id) {
    throw new ORPCError("NOT_FOUND", { message: "Conversation not found" });
  }
  await deleteConversationById(ctx.db, conversation.id);
  return { deleted: true };
}

async function loadProposal(ctx: Context, proposalId: string): Promise<AiProposal> {
  const proposal = await findProposalById(ctx.db, proposalId);
  if (!proposal) {
    throw new ORPCError("NOT_FOUND", { message: "Proposal not found" });
  }
  return proposal;
}

async function assertProposalSubject(
  ctx: Context,
  companyId: string,
  proposal: AiProposal,
): Promise<void> {
  if (proposal.subjectType === "case") {
    const caseCompanyId = await loadCaseCompanyId(ctx.db, proposal.subjectId);
    if (!caseCompanyId || caseCompanyId !== companyId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Proposal subject does not belong to this company",
        data: { companyId, proposalId: proposal.id },
      });
    }
    return;
  }
  if (proposal.subjectType === "company") {
    if (proposal.subjectId !== companyId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Proposal subject does not belong to this company",
        data: { companyId, proposalId: proposal.id },
      });
    }
    return;
  }
  if (proposal.subjectType === "filing") {
    const filingCompanyId = await findFilingCompanyId(ctx.db, proposal.subjectId);
    if (!filingCompanyId || filingCompanyId !== companyId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Proposal subject does not belong to this company",
        data: { companyId, proposalId: proposal.id },
      });
    }
    return;
  }
  throw new ORPCError("BAD_REQUEST", {
    message: `Unsupported proposal subject type: ${proposal.subjectType}`,
  });
}

export async function acceptProposal(
  ctx: Context,
  input: { companyId: string; proposalId: string },
) {
  const proposal = await loadProposal(ctx, input.proposalId);
  await assertProposalSubject(ctx, input.companyId, proposal);

  let applied = 0;
  if (proposal.kind === "case_field_fills" && proposal.subjectType === "case") {
    await assertCompanyPermission(ctx, input.companyId, "cases.write");

    const payload = asRecord(proposal.payload) ?? {};
    const fields = Array.isArray(payload.fields) ? payload.fields : [];
    const entries = fields
      .map((raw) => asRecord(raw))
      .filter((field): field is Record<string, unknown> => field !== null)
      .map((field) => ({
        fieldKey: String(field.fieldKey ?? ""),
        valueText: typeof field.valueText === "string" ? field.valueText : null,
        valueJsonb: field.valueJsonb,
        sourceKind: "ai" as const,
        aiProposalId: proposal.id,
        confidence: typeof field.confidence === "number" ? field.confidence : null,
      }))
      .filter((entry) => entry.fieldKey.length > 0);

    if (entries.length > 0) {
      const result = await applyCaseFields(ctx, {
        caseId: proposal.subjectId,
        entries,
        mode: "merge",
      });
      applied = result.applied;
    }
  }

  const updated = await updateProposalStatus(ctx.db, proposal.id, "accepted");

  await supersedeDraftProposals(ctx.db, {
    subjectType: proposal.subjectType,
    subjectId: proposal.subjectId,
    kind: proposal.kind,
    exceptId: proposal.id,
  });

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "ai_proposal",
    entityId: proposal.id,
    action: "ai.proposal_accepted",
    summary: `Accepted AI proposal (${proposal.kind})`,
    data: { applied },
  });

  return { proposal: updated ?? proposal, applied };
}

export async function rejectProposal(
  ctx: Context,
  input: { companyId: string; proposalId: string; reason?: string },
) {
  const proposal = await loadProposal(ctx, input.proposalId);
  await assertProposalSubject(ctx, input.companyId, proposal);

  const updated = await updateProposalStatus(ctx.db, proposal.id, "rejected");

  await recordActivity(ctx, {
    companyId: input.companyId,
    actorType: "user",
    entityType: "ai_proposal",
    entityId: proposal.id,
    action: "ai.proposal_rejected",
    summary: input.reason ?? `Rejected AI proposal (${proposal.kind})`,
  });

  return { proposal: updated ?? proposal };
}

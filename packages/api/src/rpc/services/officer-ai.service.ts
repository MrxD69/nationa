import { ORPCError } from "@orpc/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import { buildOfficerSystemPrompt } from "../../ai/officer-prompt";
import { createOfficerTools } from "../../ai/officer-tools";
import { resolveAssistantLocale } from "../../ai/prompt";
import { assertAgencyPermission, isMinistryAgent } from "../../auth/access";
import type { Context } from "../context";
import { listAllActiveAgencies } from "../repositories/submissions.repo";
import { listMyAgencies } from "./submissions.service";

type OfficerAssistantBody = {
  messages?: unknown;
  locale?: string;
  organizationId?: string;
};

type OfficerScope = {
  agencyId: string;
  agencyName: string | null;
  isMinistry: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Resolve the officer's agency server-side. An officer is pinned to their active
 * membership; a ministry agent may target any active organization via the
 * optional `organizationId` and otherwise defaults to the first one.
 */
async function resolveOfficerScope(
  context: Context,
  body: OfficerAssistantBody,
  userId: string,
): Promise<OfficerScope> {
  if (await isMinistryAgent(context, userId)) {
    const allAgencies = await listAllActiveAgencies(context.db);
    const requested =
      typeof body.organizationId === "string" && body.organizationId.length > 0
        ? body.organizationId
        : null;
    const chosen = requested
      ? allAgencies.find((agency) => agency.id === requested)
      : allAgencies[0];
    if (!chosen) {
      if (requested) {
        throw new ORPCError("BAD_REQUEST", { message: "Organisation inconnue ou inactive." });
      }
      throw new ORPCError("FORBIDDEN", { message: "Aucune organisation accessible." });
    }
    return { agencyId: chosen.id, agencyName: chosen.nameFr, isMinistry: true };
  }

  const agencies = await listMyAgencies(context);
  const chosen = agencies[0];
  if (!chosen) {
    throw new ORPCError("FORBIDDEN", {
      message: "Aucune organisation active n'est rattachée à votre compte.",
    });
  }
  return { agencyId: chosen.id, agencyName: chosen.nameFr, isMinistry: false };
}

/**
 * Read-only, agency-scoped AI assistant for administration officers.
 *
 * Stateless v1: conversations and messages are never persisted (no writes).
 */
export async function streamOfficerAssistantResponse(
  context: Context,
  rawBody: unknown,
): Promise<Response> {
  const user = context.user;
  if (!user) {
    return jsonError(401, "Authentification requise.");
  }

  const body = (asRecord(rawBody) ?? {}) as OfficerAssistantBody;
  const uiMessages = Array.isArray(body.messages) ? (body.messages as UIMessage[]) : null;
  if (!uiMessages) {
    return jsonError(400, "Le corps de la requête doit contenir un tableau « messages ».");
  }

  const locale = resolveAssistantLocale(typeof body.locale === "string" ? body.locale : undefined);

  let scope: OfficerScope;
  try {
    scope = await resolveOfficerScope(context, body, user.id);
    await assertAgencyPermission(context, scope.agencyId, "officer.ai.use");
  } catch (error) {
    if (error instanceof ORPCError) {
      return jsonError(error.status, error.message);
    }
    return jsonError(500, "Impossible de déterminer votre organisation.");
  }

  const system = buildOfficerSystemPrompt({
    locale,
    agencyName: scope.agencyName,
    isMinistry: scope.isMinistry,
    today: new Date().toISOString().slice(0, 10),
  });

  const tools = createOfficerTools({
    ctx: context,
    userId: user.id,
    agencyId: scope.agencyId,
    agencyName: scope.agencyName,
    isMinistry: scope.isMinistry,
    locale,
  });

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: context.ai.model,
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
  });

  return createUIMessageStreamResponse({ stream });
}

import type { JsonObject } from "@nationa/db";

import type { Context } from "../context";
import {
  insertCaseActivityEvent,
  listCaseActivityEvents,
} from "../repositories/case-activity.repo";

export type CaseActorType = "user" | "system" | "ai" | "officer";

export type EmitCaseEventInput = {
  caseId: string;
  companyId?: string | null;
  actorUserId?: string | null;
  actorType?: CaseActorType;
  action: string;
  summary?: string;
  data?: JsonObject;
};

export async function emitCaseEvent(context: Context, input: EmitCaseEventInput): Promise<void> {
  await insertCaseActivityEvent(context.db, {
    companyId: input.companyId ?? null,
    actorUserId: input.actorUserId ?? context.user?.id ?? null,
    actorType: input.actorType ?? (context.user ? "user" : "system"),
    entityType: "case",
    entityId: input.caseId,
    action: input.action,
    summary: input.summary ?? null,
    data: input.data ?? null,
  });
}

export async function listCaseActivity(
  context: Context,
  input: { caseId: string; limit?: number },
): Promise<unknown[]> {
  return listCaseActivityEvents(context.db, {
    caseId: input.caseId,
    limit: input.limit ?? 50,
  });
}

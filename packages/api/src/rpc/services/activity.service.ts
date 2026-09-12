import type { JsonObject } from "@nationa/db";

import { assertCompanyPermission, requireUser } from "../../auth/access";
import type { Context } from "../context";
import { insertActivityEvent, listActivityEvents } from "../repositories/activity.repo";

export type ActivityActorType = "user" | "system" | "ai" | "officer";

export type RecordActivityInput = {
  companyId?: string | null;
  actorUserId?: string | null;
  actorType?: ActivityActorType;
  entityType: string;
  entityId?: string | null;
  action: string;
  summary?: string | null;
  data?: JsonObject | null;
};

export async function recordActivity(ctx: Context, input: RecordActivityInput): Promise<void> {
  await insertActivityEvent(ctx.db, {
    companyId: input.companyId ?? null,
    actorUserId: input.actorUserId ?? ctx.user?.id ?? null,
    actorType: input.actorType ?? (ctx.user ? "user" : "system"),
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    action: input.action,
    summary: input.summary ?? null,
    data: input.data ?? null,
  });
}

export async function listActivity(
  ctx: Context,
  input: {
    companyId?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  },
) {
  const user = requireUser(ctx);
  if (input.companyId) {
    await assertCompanyPermission(ctx, input.companyId, "activity.read");
  }

  return listActivityEvents(ctx.db, {
    userId: user.id,
    companyId: input.companyId,
    entityType: input.entityType,
    entityId: input.entityId,
    limit: Math.min(input.limit ?? 50, 200),
  });
}

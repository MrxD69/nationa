import { ORPCError } from "@orpc/server";

import { assertCompanyAccess, assertCompanyPermission, requireUser } from "../../auth/access";
import type { Context } from "../context";
import {
  countUnreadNotifications,
  findNotificationById,
  findRecentDeadlineNotification,
  insertNotification,
  listActiveObligationsByAgency,
  listNotificationsForUser,
  markAllNotificationsRead,
  updateNotificationReadAt,
} from "../repositories/notifications.repo";

export type NotificationType =
  | "submission_status"
  | "review_decision"
  | "deadline_reminder"
  | "document_processed"
  | "check_failed"
  | "access_granted"
  | "invoice_ready"
  | "mention"
  | "system";

export type NotifyInput = {
  userId: string;
  companyId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

export async function notify(ctx: Context, input: NotifyInput): Promise<void> {
  await insertNotification(ctx.db, {
    userId: input.userId,
    companyId: input.companyId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
  });
}

export async function listNotifications(
  ctx: Context,
  input: { companyId?: string; unreadOnly?: boolean; limit?: number },
) {
  const user = requireUser(ctx);
  if (input.companyId) {
    await assertCompanyPermission(ctx, input.companyId, "activity.read");
  }

  return listNotificationsForUser(ctx.db, {
    userId: user.id,
    companyId: input.companyId,
    unreadOnly: input.unreadOnly,
    limit: Math.min(input.limit ?? 50, 100),
  });
}

export async function unreadCount(ctx: Context, input: { companyId?: string }): Promise<number> {
  const user = requireUser(ctx);
  if (input.companyId) {
    await assertCompanyPermission(ctx, input.companyId, "activity.read");
  }
  return countUnreadNotifications(ctx.db, {
    userId: user.id,
    companyId: input.companyId,
  });
}

export async function markRead(ctx: Context, input: { notificationId: string }) {
  const user = requireUser(ctx);
  const existing = await findNotificationById(ctx.db, input.notificationId);
  if (!existing || existing.userId !== user.id) {
    throw new ORPCError("NOT_FOUND", { message: "Notification not found" });
  }
  const updated = await updateNotificationReadAt(
    ctx.db,
    input.notificationId,
    existing.readAt ?? new Date(),
  );
  return updated ?? existing;
}

export async function markAllRead(
  ctx: Context,
  input: { companyId?: string },
): Promise<{ updated: number }> {
  const user = requireUser(ctx);
  if (input.companyId) {
    await assertCompanyPermission(ctx, input.companyId, "activity.read");
  }
  const updated = await markAllNotificationsRead(ctx.db, {
    userId: user.id,
    companyId: input.companyId,
    readAt: new Date(),
  });
  return { updated };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function nextDeadlineFromRule(rule: unknown, from: Date = new Date()): Date | null {
  const record = asRecord(rule);
  if (!record) {
    return null;
  }
  const type = typeof record.type === "string" ? record.type : "";

  if (type === "monthly") {
    const day = typeof record.day === "number" ? record.day : 20;
    const candidate = new Date(from.getFullYear(), from.getMonth(), day);
    if (candidate.getTime() <= from.getTime()) {
      return new Date(from.getFullYear(), from.getMonth() + 1, day);
    }
    return candidate;
  }

  if (type === "annual") {
    const month = typeof record.month === "number" ? record.month - 1 : 2;
    const day = typeof record.day === "number" ? record.day : 25;
    const candidate = new Date(from.getFullYear(), month, day);
    if (candidate.getTime() <= from.getTime()) {
      return new Date(from.getFullYear() + 1, month, day);
    }
    return candidate;
  }

  return null;
}

export async function syncDeadlineNotifications(
  ctx: Context,
  input: { companyId: string; withinDays?: number },
): Promise<{ created: number }> {
  const user = requireUser(ctx);
  await assertCompanyAccess(ctx, input.companyId);

  const withinDays = input.withinDays ?? 30;
  const now = new Date();
  const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const rows = await listActiveObligationsByAgency(ctx.db, "DGI");

  let created = 0;
  for (const obligation of rows) {
    const deadline = nextDeadlineFromRule(obligation.deadlineRule, now);
    if (!deadline || deadline.getTime() > horizon.getTime()) {
      continue;
    }

    const existing = await findRecentDeadlineNotification(ctx.db, {
      userId: user.id,
      companyId: input.companyId,
      obligationId: obligation.id,
      since,
    });
    if (existing) {
      continue;
    }

    await notify(ctx, {
      userId: user.id,
      companyId: input.companyId,
      type: "deadline_reminder",
      title: obligation.nameFr,
      body: obligation.nameAr ?? obligation.description ?? null,
      entityType: "obligation",
      entityId: obligation.id,
    });
    created += 1;
  }

  return { created };
}

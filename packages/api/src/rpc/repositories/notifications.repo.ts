import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";

import { notifications, obligations, type NewNotification, type Notification } from "@nationa/db";

import type { Db } from "../context";

export async function insertNotification(db: Db, values: NewNotification): Promise<void> {
  await db.insert(notifications).values(values);
}

export async function listNotificationsForUser(
  db: Db,
  filter: {
    userId: string;
    companyId?: string;
    unreadOnly?: boolean;
    limit: number;
  },
): Promise<Notification[]> {
  const conditions = [eq(notifications.userId, filter.userId)];
  if (filter.companyId) {
    conditions.push(eq(notifications.companyId, filter.companyId));
  }
  if (filter.unreadOnly) {
    conditions.push(isNull(notifications.readAt));
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(filter.limit);
}

export async function countUnreadNotifications(
  db: Db,
  filter: { userId: string; companyId?: string },
): Promise<number> {
  const conditions = [eq(notifications.userId, filter.userId), isNull(notifications.readAt)];
  if (filter.companyId) {
    conditions.push(eq(notifications.companyId, filter.companyId));
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(...conditions));
  return row?.count ?? 0;
}

export async function findNotificationById(db: Db, id: string): Promise<Notification | null> {
  const [row] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  return row ?? null;
}

export async function updateNotificationReadAt(
  db: Db,
  id: string,
  readAt: Date,
): Promise<Notification | null> {
  const [updated] = await db
    .update(notifications)
    .set({ readAt })
    .where(eq(notifications.id, id))
    .returning();
  return updated ?? null;
}

export async function markAllNotificationsRead(
  db: Db,
  filter: { userId: string; companyId?: string; readAt: Date },
): Promise<number> {
  const conditions = [eq(notifications.userId, filter.userId), isNull(notifications.readAt)];
  if (filter.companyId) {
    conditions.push(eq(notifications.companyId, filter.companyId));
  }
  const updated = await db
    .update(notifications)
    .set({ readAt: filter.readAt })
    .where(and(...conditions))
    .returning({ id: notifications.id });
  return updated.length;
}

export async function listActiveObligationsByAgency(db: Db, agencyId: string) {
  return db
    .select()
    .from(obligations)
    .where(and(eq(obligations.active, true), eq(obligations.agencyId, agencyId)));
}

export async function findRecentDeadlineNotification(
  db: Db,
  filter: { userId: string; companyId: string; obligationId: string; since: Date },
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, filter.userId),
        eq(notifications.companyId, filter.companyId),
        eq(notifications.type, "deadline_reminder"),
        eq(notifications.entityType, "obligation"),
        eq(notifications.entityId, filter.obligationId),
        gte(notifications.createdAt, filter.since),
      ),
    )
    .limit(1);
  return row ?? null;
}

import { and, desc, eq, inArray, isNull, or, type SQL } from "drizzle-orm";

import {
  activityEvents,
  companyAccessGrants,
  type ActivityEvent,
  type NewActivityEvent,
} from "@nationa/db";

import type { Db } from "../context";

export async function insertActivityEvent(db: Db, values: NewActivityEvent): Promise<void> {
  await db.insert(activityEvents).values(values);
}

export async function listAccessibleCompanyIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ companyId: companyAccessGrants.companyId })
    .from(companyAccessGrants)
    .where(
      and(
        eq(companyAccessGrants.userId, userId),
        eq(companyAccessGrants.status, "active"),
        isNull(companyAccessGrants.revokedAt),
      ),
    );
  return rows.map((row) => row.companyId);
}

export async function listActivityEvents(
  db: Db,
  filter: {
    userId: string;
    companyId?: string;
    entityType?: string;
    entityId?: string;
    limit: number;
  },
): Promise<ActivityEvent[]> {
  const conditions: SQL[] = [];

  if (filter.companyId) {
    conditions.push(eq(activityEvents.companyId, filter.companyId));
  } else {
    const accessibleCompanyIds = await listAccessibleCompanyIds(db, filter.userId);
    const scope = accessibleCompanyIds.length
      ? or(
          eq(activityEvents.actorUserId, filter.userId),
          inArray(activityEvents.companyId, accessibleCompanyIds),
        )
      : eq(activityEvents.actorUserId, filter.userId);
    if (scope) {
      conditions.push(scope);
    }
  }

  if (filter.entityType) {
    conditions.push(eq(activityEvents.entityType, filter.entityType));
  }
  if (filter.entityId) {
    conditions.push(eq(activityEvents.entityId, filter.entityId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(activityEvents)
    .where(where)
    .orderBy(desc(activityEvents.createdAt))
    .limit(filter.limit);
}

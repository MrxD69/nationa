import { and, desc, eq } from "drizzle-orm";

import { activityEvents, type ActivityEvent, type NewActivityEvent } from "@nationa/db";

import type { Db } from "../context";

export async function insertCaseActivityEvent(db: Db, values: NewActivityEvent): Promise<void> {
  await db.insert(activityEvents).values(values);
}

export async function listCaseActivityEvents(
  db: Db,
  filter: { caseId: string; limit: number },
): Promise<ActivityEvent[]> {
  return db
    .select()
    .from(activityEvents)
    .where(and(eq(activityEvents.entityType, "case"), eq(activityEvents.entityId, filter.caseId)))
    .orderBy(desc(activityEvents.createdAt))
    .limit(filter.limit);
}

import { eq } from "drizzle-orm";

import { profiles, type NewProfile } from "@nationa/db";

import type { Db } from "../context";

export async function findProfileByUserId(db: Db, userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return profile ?? null;
}

export async function insertProfile(db: Db, values: NewProfile) {
  const [created] = await db.insert(profiles).values(values).onConflictDoNothing().returning();

  return created ?? null;
}

export async function updateProfile(db: Db, userId: string, values: Partial<NewProfile>) {
  const [updated] = await db
    .update(profiles)
    .set(values)
    .where(eq(profiles.userId, userId))
    .returning();

  return updated ?? null;
}

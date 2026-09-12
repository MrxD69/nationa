import { eq } from "drizzle-orm";

import { preferences, type NewPreferences, type Preferences } from "@nationa/db";

import type { Db } from "../context";

export type PreferenceValues = {
  theme?: string | null;
  aiInstructions?: string | null;
  locale?: string | null;
};

export async function getByUserId(db: Db, userId: string): Promise<Preferences | null> {
  const [row] = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1);

  return row ?? null;
}

export async function upsert(
  db: Db,
  userId: string,
  values: PreferenceValues,
): Promise<Preferences | null> {
  const columns = toColumns(values);
  const [row] = await db
    .insert(preferences)
    .values({ userId, ...columns })
    .onConflictDoUpdate({
      target: preferences.userId,
      set: { ...columns, updatedAt: new Date() },
    })
    .returning();

  return row ?? null;
}

function toColumns(values: PreferenceValues): Partial<NewPreferences> {
  const columns: Partial<NewPreferences> = {};
  if (values.theme !== undefined) {
    columns.theme = values.theme as unknown as NewPreferences["theme"];
  }
  if (values.aiInstructions !== undefined) {
    columns.aiInstructions = values.aiInstructions as unknown as NewPreferences["aiInstructions"];
  }
  if (typeof values.locale === "string") {
    columns.locale = values.locale;
  }
  return columns;
}

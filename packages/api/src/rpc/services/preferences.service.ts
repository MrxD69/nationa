import { ORPCError } from "@orpc/server";

import type { Preferences } from "@nationa/db";

import { requireUser } from "../../auth/access";
import type { Context } from "../context";
import * as repo from "../repositories/preferences.repo";

export type PreferencesResult = {
  theme: string | null;
  aiInstructions: string | null;
  locale: string | null;
};

export type UpdatePreferencesInput = {
  theme?: string | null;
  aiInstructions?: string | null;
  locale?: string | null;
};

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toResult(row: Preferences): PreferencesResult {
  return {
    theme: readString(row.theme),
    aiInstructions: readString(row.aiInstructions),
    locale: row.locale ?? null,
  };
}

export async function getPreferences(context: Context): Promise<PreferencesResult> {
  const user = requireUser(context);

  const existing = await repo.getByUserId(context.db, user.id);
  if (existing) {
    return toResult(existing);
  }

  const created = await repo.upsert(context.db, user.id, {});
  if (created) {
    return toResult(created);
  }

  const fallback = await repo.getByUserId(context.db, user.id);
  if (!fallback) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to initialize preferences",
    });
  }

  return toResult(fallback);
}

export async function updatePreferences(
  context: Context,
  input: UpdatePreferencesInput,
): Promise<PreferencesResult> {
  const user = requireUser(context);

  const values: repo.PreferenceValues = {};
  if (input.theme !== undefined) {
    values.theme = input.theme;
  }
  if (input.aiInstructions !== undefined) {
    values.aiInstructions = input.aiInstructions;
  }
  if (typeof input.locale === "string") {
    values.locale = input.locale;
  }

  const updated = await repo.upsert(context.db, user.id, values);
  if (!updated) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to update preferences",
    });
  }

  return toResult(updated);
}

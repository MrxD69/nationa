import { ORPCError } from "@orpc/server";

import type { NewProfile, OnboardingAnswers, Profile } from "@nationa/db";

import { requireUser } from "../../auth/access";
import { parseAccountType } from "../../domain/account";
import type { Context } from "../context";
import * as repo from "../repositories/profiles.repo";

/**
 * Loads the current user's profile, creating a minimal one on first use.
 * Profiles are not provisioned by a database trigger, so every feature that
 * depends on one must be able to ensure it exists.
 */
export async function ensureProfile(context: Context): Promise<Profile> {
  const user = requireUser(context);

  const existing = await repo.findProfileByUserId(context.db, user.id);

  if (existing) {
    return existing;
  }

  const created = await repo.insertProfile(context.db, {
    userId: user.id,
    accountType: parseAccountType(user.accountType) ?? "owner",
  });

  if (created) {
    return created;
  }

  const fallback = await repo.findProfileByUserId(context.db, user.id);

  if (!fallback) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to initialize profile",
    });
  }

  return fallback;
}

export type ProfileExtras = Partial<
  Pick<NewProfile, "accountType" | "termsAcceptedAt" | "displayName">
>;

/**
 * Shallow-merges `patch` into `profiles.onboardingAnswers`, preserving keys
 * written by previous onboarding steps. Optionally updates sibling columns.
 */
export async function mergeOnboardingAnswers(
  context: Context,
  input: { patch: OnboardingAnswers; extras?: ProfileExtras },
): Promise<Profile> {
  const profile = await ensureProfile(context);
  const answers: OnboardingAnswers = { ...profile.onboardingAnswers, ...input.patch };

  const updated = await repo.updateProfile(context.db, profile.userId, {
    onboardingAnswers: answers,
    ...input.extras,
  });

  if (!updated) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to update profile",
    });
  }

  return updated;
}

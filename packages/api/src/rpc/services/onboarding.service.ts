import { ORPCError } from "@orpc/server";

import { requireUser } from "../../auth/access";
import {
  ACCOUNT_TYPE_BY_CHOICE,
  deriveOnboardingStatus,
  isOnboardingCompleted,
  readConsent,
  type OnboardingChoice,
} from "../../domain/onboarding";
import type { Context } from "../context";
import { userHasActiveCompany } from "./companies.service";
import { ensureProfile, mergeOnboardingAnswers } from "./profiles.service";

export async function getOnboarding(context: Context) {
  const user = requireUser(context);
  const profile = await ensureProfile(context);
  const hasCompany = await userHasActiveCompany(context, { userId: user.id });

  return {
    status: deriveOnboardingStatus(profile),
    accountType: profile.accountType,
    answers: profile.onboardingAnswers ?? {},
    hasCompany,
  };
}

export async function saveOnboardingAnswers(context: Context, input: { choice: OnboardingChoice }) {
  const accountType = ACCOUNT_TYPE_BY_CHOICE[input.choice];
  const profile = await mergeOnboardingAnswers(context, {
    patch: { choice: input.choice, accountType },
    extras: { accountType },
  });

  return {
    status: deriveOnboardingStatus(profile),
    accountType,
    answers: profile.onboardingAnswers ?? {},
  };
}

export async function acceptConsent(
  context: Context,
  input: { policyVersion: string; agreed: true },
) {
  const agreedAt = new Date();
  const profile = await mergeOnboardingAnswers(context, {
    patch: {
      consent: {
        policyVersion: input.policyVersion,
        agreed: true,
        agreedAt: agreedAt.toISOString(),
      },
    },
    extras: { termsAcceptedAt: agreedAt },
  });

  return {
    status: deriveOnboardingStatus(profile),
    consent: readConsent(profile.onboardingAnswers),
  };
}

export async function completeOnboarding(context: Context) {
  const profile = await ensureProfile(context);

  if (isOnboardingCompleted(profile)) {
    return {
      status: "completed" as const,
      completedAt: profile.onboardingAnswers?.completedAt,
      answers: profile.onboardingAnswers ?? {},
    };
  }

  if (!readConsent(profile.onboardingAnswers) || !profile.termsAcceptedAt) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Consent is required before completing onboarding",
    });
  }

  const completedAt = new Date().toISOString();
  const updated = await mergeOnboardingAnswers(context, { patch: { completedAt } });

  return {
    status: "completed" as const,
    completedAt,
    answers: updated.onboardingAnswers ?? {},
  };
}

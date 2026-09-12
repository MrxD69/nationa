import { z } from "zod";

import type { OnboardingAnswers, Profile } from "@nationa/db";

export const onboardingChoiceSchema = z.enum(["has_company", "no_company", "accountant"]);
export type OnboardingChoice = z.infer<typeof onboardingChoiceSchema>;

export type OnboardingStatus = "not_started" | "in_progress" | "completed";

export type OnboardingConsent = {
  policyVersion: string;
  agreed: boolean;
  agreedAt: string;
};

export const ACCOUNT_TYPE_BY_CHOICE: Record<OnboardingChoice, "owner" | "accountant"> = {
  has_company: "owner",
  no_company: "owner",
  accountant: "accountant",
};

export function readOnboardingChoice(
  answers: OnboardingAnswers | null | undefined,
): OnboardingChoice | null {
  const choice = answers?.choice;
  return onboardingChoiceSchema.safeParse(choice).success ? (choice as OnboardingChoice) : null;
}

export function readConsent(
  answers: OnboardingAnswers | null | undefined,
): OnboardingConsent | null {
  const consent = answers?.consent;
  if (!consent || typeof consent !== "object") {
    return null;
  }
  const record = consent as Record<string, unknown>;
  if (record.agreed !== true) {
    return null;
  }
  return {
    policyVersion: typeof record.policyVersion === "string" ? record.policyVersion : "",
    agreed: true,
    agreedAt: typeof record.agreedAt === "string" ? record.agreedAt : "",
  };
}

export function isOnboardingCompleted(profile: Profile): boolean {
  return typeof profile.onboardingAnswers?.completedAt === "string";
}

export function deriveOnboardingStatus(profile: Profile): OnboardingStatus {
  if (isOnboardingCompleted(profile)) {
    return "completed";
  }
  const answers = profile.onboardingAnswers ?? {};
  if (readOnboardingChoice(answers) || readConsent(answers) || profile.termsAcceptedAt) {
    return "in_progress";
  }
  return "not_started";
}

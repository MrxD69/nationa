import type { OnboardingAnswers } from "@nationa/db";

import type { Context } from "../context";
import { mergeOnboardingAnswers as mergeOnboardingAnswersService } from "../rpc/services/profiles.service";
import type { ProfileExtras } from "../rpc/services/profiles.service";

export { ensureProfile } from "../rpc/services/profiles.service";
export type { ProfileExtras } from "../rpc/services/profiles.service";

export function mergeOnboardingAnswers(
  context: Context,
  patch: OnboardingAnswers,
  extras: ProfileExtras = {},
) {
  return mergeOnboardingAnswersService(context, { patch, extras });
}

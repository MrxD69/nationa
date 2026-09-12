import { z } from "zod";

import { onboardingChoiceSchema } from "../../domain/onboarding";
import { userProcedure } from "../builders";
import {
  acceptConsent,
  completeOnboarding,
  getOnboarding,
  saveOnboardingAnswers,
} from "../services/onboarding.service";

export const onboardingRouter = {
  get: userProcedure.handler(({ context }) => getOnboarding(context)),

  saveAnswers: userProcedure
    .input(z.object({ choice: onboardingChoiceSchema }))
    .handler(({ context, input }) => saveOnboardingAnswers(context, input)),

  acceptConsent: userProcedure
    .input(z.object({ policyVersion: z.string().min(1), agreed: z.literal(true) }))
    .handler(({ context, input }) => acceptConsent(context, input)),

  complete: userProcedure.handler(({ context }) => completeOnboarding(context)),
};

import { z } from "zod";

import { userProcedure } from "../builders";
import { getPreferences, updatePreferences } from "../services/preferences.service";

export const preferencesRouter = {
  get: userProcedure.handler(({ context }) => getPreferences(context)),

  update: userProcedure
    .input(
      z.object({
        theme: z.string().nullish(),
        aiInstructions: z.string().nullish(),
        locale: z.string().nullish(),
      }),
    )
    .handler(({ context, input }) => updatePreferences(context, input)),
};

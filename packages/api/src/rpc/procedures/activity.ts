import { z } from "zod";

import { userProcedure } from "../builders";
import { listActivity } from "../services/activity.service";

export const activityRouter = {
  list: userProcedure
    .input(
      z.object({
        companyId: z.string().min(1).optional(),
        entityType: z.string().min(1).optional(),
        entityId: z.guid().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .handler(({ context, input }) => listActivity(context, input)),
};

import { z } from "zod";

import { publicProcedure } from "../builders";
import { getProcedure, listProcedures } from "../services/procedures.service";

export const proceduresRouter = {
  list: publicProcedure.handler(({ context }) => listProcedures(context)),

  get: publicProcedure
    .input(
      z.object({
        id: z.guid().optional(),
        code: z.string().min(1).optional(),
      }),
    )
    .handler(({ context, input }) => getProcedure(context, input)),
};

import { z } from "zod";

import { userProcedure } from "../builders";
import {
  getActionTracker,
  listActionCatalog,
  listOutstandingActions,
  runActionChecks,
  searchActions,
  startAction,
} from "../services/actions.service";

export const actionsRouter = {
  list: userProcedure
    .input(
      z.object({
        agencyId: z.string().min(1).optional(),
        companyId: z.string().min(1).optional(),
      }),
    )
    .handler(({ context, input }) => listActionCatalog(context, input)),

  search: userProcedure
    .input(
      z.object({
        query: z.string().min(1),
        companyId: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .handler(({ context, input }) => searchActions(context, input)),

  outstanding: userProcedure
    .input(
      z.object({
        companyId: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .handler(({ context, input }) => listOutstandingActions(context, input)),

  get: userProcedure
    .input(
      z.object({
        companyId: z.string().min(1).optional(),
        templateId: z.guid().optional(),
        code: z.string().min(1).optional(),
        caseId: z.guid().optional(),
      }),
    )
    .handler(({ context, input }) => getActionTracker(context, input)),

  start: userProcedure
    .input(
      z.object({
        templateId: z.guid(),
        companyId: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
      }),
    )
    .handler(({ context, input }) => startAction(context, input)),

  runChecks: userProcedure
    .input(z.object({ caseId: z.guid() }))
    .handler(({ context, input }) => runActionChecks(context, input)),
};

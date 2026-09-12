import { z } from "zod";

import { companyProcedure, userProcedure } from "../builders";
import {
  acceptProposal,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  rejectProposal,
} from "../services/ai.service";

export const aiRouter = {
  listConversations: userProcedure
    .input(
      z.object({
        companyId: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .handler(({ context, input }) => listConversations(context, input)),

  createConversation: userProcedure
    .input(
      z.object({
        companyId: z.string().min(1).optional(),
        caseId: z.guid().optional(),
        title: z.string().min(1).max(200).optional(),
      }),
    )
    .handler(({ context, input }) => createConversation(context, input)),

  getConversation: userProcedure
    .input(z.object({ conversationId: z.guid() }))
    .handler(({ context, input }) => getConversation(context, input)),

  deleteConversation: userProcedure
    .input(z.object({ conversationId: z.guid() }))
    .handler(({ context, input }) => deleteConversation(context, input)),

  acceptProposal: companyProcedure("ai.use")
    .input(z.object({ companyId: z.string().min(1), proposalId: z.guid() }))
    .handler(({ context, input }) => acceptProposal(context, input)),

  rejectProposal: companyProcedure("ai.use")
    .input(
      z.object({
        companyId: z.string().min(1),
        proposalId: z.guid(),
        reason: z.string().max(2000).optional(),
      }),
    )
    .handler(({ context, input }) => rejectProposal(context, input)),
};

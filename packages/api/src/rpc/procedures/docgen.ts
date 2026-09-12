import { z } from "zod";

import { userProcedure } from "../builders";
import {
  approveDraft,
  generateDraft,
  getDocumentContext,
  getTemplate,
  listDrafts,
  listTemplates,
  rejectDraft,
  updateDraft,
} from "../services/docgen.service";

const languageSchema = z.enum(["fr", "ar"]);
const modeSchema = z.enum(["template", "ai"]);

const scopeFields = {
  caseId: z.guid().optional(),
  companyId: z.string().min(1).optional(),
};

const answerSchema = z.object({
  questionId: z.string().min(1),
  valueText: z.string().nullish(),
});

export const docgenRouter = {
  listTemplates: userProcedure.handler(({ context }) => listTemplates(context)),

  getTemplate: userProcedure
    .input(z.object({ code: z.string().min(1) }))
    .handler(({ context, input }) => getTemplate(context, input)),

  context: userProcedure
    .input(
      z.object({
        templateCode: z.string().min(1),
        ...scopeFields,
      }),
    )
    .handler(({ context, input }) => getDocumentContext(context, input)),

  generateDraft: userProcedure
    .input(
      z.object({
        templateCode: z.string().min(1),
        language: languageSchema,
        mode: modeSchema,
        stepId: z.guid().optional(),
        ...scopeFields,
        answers: z.array(answerSchema).optional(),
      }),
    )
    .handler(({ context, input }) => generateDraft(context, input)),

  updateDraft: userProcedure
    .input(
      z.object({
        proposalId: z.guid(),
        fields: z
          .array(
            z.object({
              key: z.string().min(1),
              valueText: z.string().nullish(),
              valueJsonb: z.unknown().optional(),
            }),
          )
          .optional(),
        answers: z.array(answerSchema).optional(),
      }),
    )
    .handler(({ context, input }) => updateDraft(context, input)),

  approveDraft: userProcedure
    .input(z.object({ proposalId: z.guid() }))
    .handler(({ context, input }) => approveDraft(context, input)),

  rejectDraft: userProcedure
    .input(
      z.object({
        proposalId: z.guid(),
        reason: z.string().max(2000).optional(),
      }),
    )
    .handler(({ context, input }) => rejectDraft(context, input)),

  listDrafts: userProcedure
    .input(
      z.object({
        ...scopeFields,
        proposalId: z.guid().optional(),
        status: z.enum(["draft", "accepted", "rejected", "superseded"]).optional(),
      }),
    )
    .handler(({ context, input }) => listDrafts(context, input)),
};

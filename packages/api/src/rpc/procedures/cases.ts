import { ORPCError } from "@orpc/server";
import { z } from "zod";

import type { CompanyPermission } from "../../permissions";
import { userProcedure } from "../builders";
import {
  applyCaseFields,
  cancelCase,
  completeStep,
  getCaseActivity,
  getCaseDetail,
  listCases,
  previewPayment,
  requireCasePermission,
  saveStepFields,
  skipStep,
  startCase,
  submitCase,
} from "../services/cases.service";

const fieldEntrySchema = z.object({
  key: z.string().min(1),
  valueText: z.string().nullish(),
  valueJsonb: z.unknown().optional(),
});

const applyEntrySchema = z.object({
  fieldKey: z.string().min(1),
  valueText: z.string().nullish(),
  valueJsonb: z.unknown().optional(),
  sourceKind: z.enum(["document", "ai", "system"]),
  sourceDocumentVersionId: z.guid().nullish(),
  extractionFieldId: z.guid().nullish(),
  aiProposalId: z.guid().nullish(),
  confidence: z.number().min(0).max(1).nullish(),
});

function extractCaseId(input: unknown): string {
  if (input && typeof input === "object" && "caseId" in input) {
    const value = (input as { caseId?: unknown }).caseId;
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  throw new ORPCError("BAD_REQUEST", { message: "caseId is required" });
}

const caseProcedure = (permission: CompanyPermission) =>
  userProcedure.use(async ({ context, next }, input) => {
    const caseRecord = await requireCasePermission(context, extractCaseId(input), permission);
    return next({ context: { caseRecord } });
  });

export const casesRouter = {
  start: userProcedure
    .input(
      z.object({
        templateId: z.guid(),
        companyId: z.string().min(1).optional(),
        applicantPersonId: z.guid().optional(),
        title: z.string().min(1).optional(),
      }),
    )
    .handler(({ context, input }) => startCase(context, input)),

  list: userProcedure
    .input(
      z.object({
        companyId: z.string().min(1).optional(),
        status: z
          .enum([
            "draft",
            "in_progress",
            "awaiting_user",
            "awaiting_review",
            "submitted",
            "approved",
            "rejected",
            "cancelled",
          ])
          .optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .handler(({ context, input }) => listCases(context, input)),

  get: caseProcedure("cases.read")
    .input(z.object({ caseId: z.guid() }))
    .handler(({ context, input }) => getCaseDetail(context, input.caseId)),

  saveFields: caseProcedure("cases.write")
    .input(
      z.object({
        caseId: z.guid(),
        stepId: z.guid().optional(),
        fields: z.array(fieldEntrySchema).min(1),
      }),
    )
    .handler(({ context, input }) =>
      saveStepFields(context, {
        caseId: input.caseId,
        stepId: input.stepId,
        fields: input.fields,
      }),
    ),

  completeStep: caseProcedure("cases.write")
    .input(z.object({ caseId: z.guid(), stepId: z.guid() }))
    .handler(({ context, input }) => completeStep(context, input)),

  skipStep: caseProcedure("cases.write")
    .input(z.object({ caseId: z.guid(), stepId: z.guid() }))
    .handler(({ context, input }) => skipStep(context, input)),

  applyFields: caseProcedure("cases.write")
    .input(
      z.object({
        caseId: z.guid(),
        entries: z.array(applyEntrySchema).min(1),
        mode: z.enum(["merge", "overwrite"]).optional(),
      }),
    )
    .handler(({ context, input }) =>
      applyCaseFields(context, {
        caseId: input.caseId,
        entries: input.entries,
        mode: input.mode,
      }),
    ),

  previewPayment: caseProcedure("cases.read")
    .input(z.object({ caseId: z.guid() }))
    .handler(({ context, input }) => previewPayment(context, input)),

  submit: caseProcedure("cases.submit")
    .input(z.object({ caseId: z.guid() }))
    .handler(({ context, input }) => submitCase(context, input)),

  activity: caseProcedure("cases.read")
    .input(z.object({ caseId: z.guid(), limit: z.number().int().min(1).max(100).optional() }))
    .handler(({ context, input }) => getCaseActivity(context, input)),

  cancel: caseProcedure("cases.cancel")
    .input(z.object({ caseId: z.guid() }))
    .handler(({ context, input }) => cancelCase(context, input)),
};

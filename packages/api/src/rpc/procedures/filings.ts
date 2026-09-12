import { z } from "zod";

import { companyProcedure } from "../builders";
import {
  createFilingDraft,
  getFiling,
  inviteAccountant,
  listDgiObligations,
  listFilings,
  previewFiling,
  recomputeFiling,
  removeFiling,
  updateFilingStatus,
} from "../services/filings.service";

const filingStatusSchema = z.enum(["draft", "ready", "under_review"]);

export const filingsRouter = {
  list: companyProcedure("filings.read")
    .input(
      z.object({
        companyId: z.string().min(1),
        status: filingStatusSchema.optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .handler(({ context, input }) => listFilings(context, input)),

  get: companyProcedure("filings.read")
    .input(z.object({ companyId: z.string().min(1), filingId: z.guid() }))
    .handler(({ context, input }) => getFiling(context, input)),

  listObligations: companyProcedure("filings.read")
    .input(z.object({ companyId: z.string().min(1) }))
    .handler(({ context, input }) => listDgiObligations(context, input)),

  preview: companyProcedure("filings.read")
    .input(
      z.object({
        companyId: z.string().min(1),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        obligationId: z.guid().optional(),
      }),
    )
    .handler(({ context, input }) => previewFiling(context, input)),

  createDraft: companyProcedure("filings.write")
    .input(
      z.object({
        companyId: z.string().min(1),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        obligationId: z.guid().optional(),
        taxType: z.string().min(1).optional(),
      }),
    )
    .handler(({ context, input }) => createFilingDraft(context, input)),

  recompute: companyProcedure("filings.write")
    .input(z.object({ companyId: z.string().min(1), filingId: z.guid() }))
    .handler(({ context, input }) => recomputeFiling(context, input)),

  updateStatus: companyProcedure("filings.write")
    .input(
      z.object({
        companyId: z.string().min(1),
        filingId: z.guid(),
        status: filingStatusSchema,
      }),
    )
    .handler(({ context, input }) => updateFilingStatus(context, input)),

  inviteAccountant: companyProcedure("filings.write")
    .input(
      z.object({
        companyId: z.string().min(1),
        filingId: z.guid().optional(),
        email: z.string().email().optional(),
        message: z.string().max(2000).optional(),
      }),
    )
    .handler(({ context, input }) => inviteAccountant(context, input)),

  remove: companyProcedure("filings.write")
    .input(z.object({ companyId: z.string().min(1), filingId: z.guid() }))
    .handler(({ context, input }) => removeFiling(context, input)),
};

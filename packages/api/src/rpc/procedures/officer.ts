import { z } from "zod";

import { agencyProcedure, userProcedure } from "../builders";
import { getAgencyAnalytics, getCompanyPatterns } from "../services/officer-analytics.service";
import {
  decideSubmission,
  getOfficerSubmission,
  listMyAgencies,
  listOfficerQueue,
  presignSubmissionDocument,
} from "../services/submissions.service";

const agencyIdSchema = z.string().min(1);

const submissionStatusSchema = z.enum([
  "draft",
  "queued",
  "in_review",
  "approved",
  "rejected",
  "returned",
  "escalated",
]);

const tierSchema = z.enum(["clean", "minor_concern", "needs_review"]);

export const officerRouter = {
  myAgencies: userProcedure.handler(({ context }) => listMyAgencies(context)),

  queue: agencyProcedure("officer.queue.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        status: submissionStatusSchema.optional(),
        tier: tierSchema.optional(),
        sort: z.enum(["cleanliness", "submittedAt"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
      }),
    )
    .handler(({ context, input }) => listOfficerQueue(context, input)),

  get: agencyProcedure("officer.review.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        submissionId: z.guid(),
      }),
    )
    .handler(({ context, input }) => getOfficerSubmission(context, input)),

  decide: agencyProcedure("officer.review.decide")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        submissionId: z.guid(),
        decision: z.enum(["approve", "reject", "return_for_correction", "escalate"]),
        reason: z.string().min(3).max(2000),
        notes: z.string().max(4000).optional(),
      }),
    )
    .handler(({ context, input }) => decideSubmission(context, input)),

  documentUrl: agencyProcedure("officer.document.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        documentVersionId: z.guid(),
      }),
    )
    .handler(({ context, input }) =>
      presignSubmissionDocument(context, {
        documentVersionId: input.documentVersionId,
        agencyId: input.agencyId,
      }),
    ),

  companyPatterns: agencyProcedure("officer.company_patterns.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        companyId: z.guid(),
      }),
    )
    .handler(({ context, input }) => getCompanyPatterns(context, input)),

  analytics: agencyProcedure("officer.analytics.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        from: z.string().optional(),
        to: z.string().optional(),
      }),
    )
    .handler(({ context, input }) => getAgencyAnalytics(context, input)),
};

import { z } from "zod";

import { companyProcedure, userProcedure } from "../builders";
import {
  createSubmissionFromCase,
  getCompanySubmission,
  listCompanySubmissions,
  listMySubmissions,
  presignSubmissionDocument,
  resubmitSubmission,
} from "../services/submissions.service";

const submissionStatusSchema = z.enum([
  "draft",
  "queued",
  "in_review",
  "approved",
  "rejected",
  "returned",
  "escalated",
]);

export const submissionsRouter = {
  mine: userProcedure.handler(({ context }) => listMySubmissions(context)),

  list: companyProcedure("submissions.read")
    .input(
      z.object({
        companyId: z.string().min(1),
        status: submissionStatusSchema.optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .handler(({ context, input }) => listCompanySubmissions(context, input)),

  get: companyProcedure("submissions.read")
    .input(
      z.object({
        companyId: z.string().min(1),
        submissionId: z.guid(),
      }),
    )
    .handler(({ context, input }) => getCompanySubmission(context, input)),

  createFromCase: companyProcedure("submissions.create")
    .input(
      z.object({
        companyId: z.string().min(1),
        caseId: z.guid(),
        acknowledgeBlockers: z.boolean().optional(),
      }),
    )
    .handler(({ context, input }) =>
      createSubmissionFromCase(context, {
        companyId: input.companyId,
        caseId: input.caseId,
        submittedByUserId: context.user.id,
        acknowledgeBlockers: input.acknowledgeBlockers,
      }),
    ),

  resubmit: companyProcedure("submissions.resubmit")
    .input(
      z.object({
        companyId: z.string().min(1),
        submissionId: z.guid(),
        acknowledgeBlockers: z.boolean().optional(),
      }),
    )
    .handler(({ context, input }) => resubmitSubmission(context, input)),

  documentUrl: companyProcedure("submissions.read")
    .input(
      z.object({
        companyId: z.string().min(1),
        documentVersionId: z.guid(),
      }),
    )
    .handler(({ context, input }) =>
      presignSubmissionDocument(context, {
        documentVersionId: input.documentVersionId,
        companyId: input.companyId,
      }),
    ),
};

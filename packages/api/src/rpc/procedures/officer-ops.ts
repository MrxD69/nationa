import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { agencyProcedure } from "../builders";
import {
  assignSubmission,
  claimSubmission,
  getDeficiencyTemplates,
  getOpsAnalytics,
  getTeamWorkload,
  issueDeficiency,
  listOpsQueue,
  releaseSubmission,
} from "../services/officer-ops.service";

const agencyIdSchema = z.string().min(1);
const submissionIdSchema = z.guid();

const statusSchema = z.enum([
  "draft",
  "queued",
  "in_review",
  "approved",
  "rejected",
  "returned",
  "escalated",
]);

const tierSchema = z.enum(["clean", "minor_concern", "needs_review"]);
const slaBucketSchema = z.enum(["on_time", "at_risk", "breached"]);
const assignmentSchema = z.enum(["all", "mine", "unassigned"]);
const sortSchema = z.enum(["priority", "submittedAt", "cleanliness"]);
const severitySchema = z.enum(["warning", "error", "blocker"]);

const dateRangeInput = {
  agencyId: agencyIdSchema,
  from: z.string().optional(),
  to: z.string().optional(),
};

export const officerOpsRouter = {
  opsQueue: agencyProcedure("officer.queue.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        status: statusSchema.optional(),
        tier: tierSchema.optional(),
        slaBucket: slaBucketSchema.optional(),
        assignment: assignmentSchema.optional(),
        sort: sortSchema.optional(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
      }),
    )
    .handler(({ context, input }) => listOpsQueue(context, input)),

  claim: agencyProcedure("officer.queue.assign")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        submissionId: submissionIdSchema,
      }),
    )
    .handler(({ context, input }) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", { message: "Authentification requise" });
      }
      return claimSubmission(context, {
        agencyId: input.agencyId,
        submissionId: input.submissionId,
        userId,
      });
    }),

  assign: agencyProcedure("officer.queue.assign")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        submissionId: submissionIdSchema,
        assigneeUserId: z.guid(),
      }),
    )
    .handler(({ context, input }) => assignSubmission(context, input)),

  release: agencyProcedure("officer.queue.assign")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        submissionId: submissionIdSchema,
      }),
    )
    .handler(({ context, input }) => releaseSubmission(context, input)),

  team: agencyProcedure("officer.queue.read")
    .input(z.object(dateRangeInput))
    .handler(({ context, input }) => getTeamWorkload(context, input)),

  opsAnalytics: agencyProcedure("officer.analytics.read")
    .input(z.object(dateRangeInput))
    .handler(({ context, input }) => getOpsAnalytics(context, input)),

  deficiencyTemplates: agencyProcedure("officer.deficiency.manage")
    .input(z.object({ agencyId: agencyIdSchema }))
    .handler(({ context, input }) => getDeficiencyTemplates(context, input)),

  issueDeficiency: agencyProcedure("officer.deficiency.manage")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        submissionId: submissionIdSchema,
        decision: z.enum(["return_for_correction", "reject"]),
        reason: z.string().min(3).max(2000),
        checklist: z
          .array(
            z.object({
              code: z.string(),
              label: z.string(),
              severity: severitySchema,
            }),
          )
          .max(20)
          .optional(),
        dueAt: z.string().optional(),
        notes: z.string().max(4000).optional(),
      }),
    )
    .handler(({ context, input }) => issueDeficiency(context, input)),
};

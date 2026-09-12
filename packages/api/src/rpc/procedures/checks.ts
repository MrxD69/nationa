import { ORPCError } from "@orpc/server";
import { z } from "zod";

import type { CheckSubject, CheckSubjectType } from "../../checks/types";
import { companyProcedure } from "../builders";
import {
  addFindingNote,
  assertFindingInCompany,
  assertSubjectInCompany,
  getSubmissionReadiness,
  listCheckRuns,
  listFindingNotes,
  listFindings,
  requireFinding,
  requireRun,
  runChecks,
  setFindingStatus,
} from "../services/checks.service";

const subjectTypeSchema = z.enum(["case", "submission", "company", "document"]);
const findingStatusSchema = z.enum(["open", "resolved", "waived", "acknowledged"]);
const findingSeveritySchema = z.enum(["info", "warning", "error", "blocker"]);
const findingNoteKindSchema = z.enum(["note", "explanation"]);

const companyInput = z.object({ companyId: z.string().min(1) });
const subjectInput = z.object({
  subjectType: subjectTypeSchema,
  subjectId: z.guid(),
});

function toSubject(input: { subjectType: CheckSubjectType; subjectId: string }): CheckSubject {
  return { type: input.subjectType, id: input.subjectId };
}

export const checksRouter = {
  run: companyProcedure("checks.run")
    .input(companyInput.merge(subjectInput))
    .handler(async ({ context, input }) => {
      await assertSubjectInCompany(context, input.companyId, input.subjectType, input.subjectId);
      return runChecks(context, toSubject(input));
    }),

  listRuns: companyProcedure("checks.read")
    .input(
      companyInput.merge(subjectInput).extend({
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await assertSubjectInCompany(context, input.companyId, input.subjectType, input.subjectId);
      return listCheckRuns(context, toSubject(input), input.limit);
    }),

  getRun: companyProcedure("checks.read")
    .input(companyInput.extend({ runId: z.guid() }))
    .handler(async ({ context, input }) => {
      const { run, findings } = await requireRun(context, input.runId);
      await assertSubjectInCompany(context, input.companyId, run.subjectType, run.subjectId);
      return { run, findings };
    }),

  listFindings: companyProcedure("checks.read")
    .input(
      companyInput.extend({
        subjectType: subjectTypeSchema.optional(),
        subjectId: z.guid().optional(),
        checkRunId: z.guid().optional(),
        findingId: z.guid().optional(),
        status: findingStatusSchema.optional(),
        severity: findingSeveritySchema.optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const filter = {
        checkRunId: input.checkRunId,
        findingId: input.findingId,
        status: input.status,
        severity: input.severity,
        limit: input.limit,
      };

      if (input.findingId) {
        const finding = await requireFinding(context, input.findingId);
        await assertFindingInCompany(context, input.companyId, finding);
        return [finding];
      }

      if (input.subjectType && input.subjectId) {
        await assertSubjectInCompany(context, input.companyId, input.subjectType, input.subjectId);
        return listFindings(context, {
          ...filter,
          subject: { type: input.subjectType, id: input.subjectId },
        });
      }

      if (input.checkRunId) {
        const { run } = await requireRun(context, input.checkRunId);
        await assertSubjectInCompany(context, input.companyId, run.subjectType, run.subjectId);
        return listFindings(context, filter);
      }

      throw new ORPCError("BAD_REQUEST", {
        message: "A subject or checkRunId is required",
      });
    }),

  setFindingStatus: companyProcedure("checks.resolve")
    .input(
      companyInput.extend({
        findingId: z.guid(),
        status: findingStatusSchema,
        note: z.string().min(1).max(2000).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const finding = await requireFinding(context, input.findingId);
      await assertFindingInCompany(context, input.companyId, finding);
      return setFindingStatus(context, {
        findingId: input.findingId,
        status: input.status,
        userId: context.user.id,
        note: input.note,
      });
    }),

  addNote: companyProcedure("checks.resolve")
    .input(
      companyInput.extend({
        findingId: z.guid(),
        body: z.string().min(1).max(4000),
        kind: findingNoteKindSchema.optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const finding = await requireFinding(context, input.findingId);
      await assertFindingInCompany(context, input.companyId, finding);
      return addFindingNote(context, {
        findingId: input.findingId,
        userId: context.user.id,
        body: input.body,
        kind: input.kind,
      });
    }),

  listNotes: companyProcedure("checks.read")
    .input(companyInput.extend({ findingId: z.guid() }))
    .handler(async ({ context, input }) => {
      const finding = await requireFinding(context, input.findingId);
      await assertFindingInCompany(context, input.companyId, finding);
      return listFindingNotes(context, input.findingId);
    }),

  readiness: companyProcedure("checks.read")
    .input(companyInput.merge(subjectInput))
    .handler(async ({ context, input }) => {
      await assertSubjectInCompany(context, input.companyId, input.subjectType, input.subjectId);
      return getSubmissionReadiness(context, toSubject(input));
    }),
};

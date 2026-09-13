import { z } from "zod";

import { agencyProcedure } from "../builders";
import {
  getConditionsSummary,
  listConditions,
  listRegistryFlags,
} from "../services/officer-monitoring.service";

const agencyIdSchema = z.string().min(1);

const conditionBucketSchema = z.enum(["overdue", "due_soon", "upcoming", "unknown"]);

const registryFlagKindSchema = z.enum([
  "duplicate_identifier",
  "duplicate_name",
  "capital_mismatch",
  "legal_form_mismatch",
  "stale_active",
  "fiscal_default",
  "missing_financial_statements",
  "suspended_with_open_submission",
]);

const severitySchema = z.enum(["warning", "error", "info"]);

// Officer monitoring: obligation/condition deadlines, registry consistency flags.
export const officerMonitoringRouter = {
  conditions: agencyProcedure("officer.conditions.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        companyId: z.guid().optional(),
        bucket: conditionBucketSchema.optional(),
        limit: z.number().int().min(1).max(200).optional(),
        cursor: z.string().optional(),
      }),
    )
    .handler(({ context, input }) => listConditions(context, input)),

  conditionsSummary: agencyProcedure("officer.conditions.read")
    .input(z.object({ agencyId: agencyIdSchema }))
    .handler(({ context, input }) => getConditionsSummary(context, input)),

  registryFlags: agencyProcedure("officer.registry.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        kind: registryFlagKindSchema.optional(),
        severity: severitySchema.optional(),
        limit: z.number().int().min(1).max(200).optional(),
        cursor: z.string().optional(),
      }),
    )
    .handler(({ context, input }) => listRegistryFlags(context, input)),
};

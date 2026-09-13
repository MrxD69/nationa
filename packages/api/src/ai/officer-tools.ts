import { ORPCError } from "@orpc/server";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

import type { Submission } from "@nationa/db";

import type { AssistantLocale } from "./types";
import { assertAgencyPermission } from "../auth/access";
import type { AgencyPermission } from "../permissions";
import type { Context } from "../rpc/context";
import { listActiveObligations } from "../rpc/repositories/officer-monitoring.repo";
import { listConditions, listRegistryFlags } from "../rpc/services/officer-monitoring.service";
import {
  getTeamWorkload as getTeamWorkloadService,
  listOpsQueue,
} from "../rpc/services/officer-ops.service";
import { buildCompanyPatterns, getOfficerSubmission } from "../rpc/services/submissions.service";
import {
  getCompanyDossier,
  searchCompaniesForDossier,
} from "../rpc/services/officer-trust.service";

/**
 * Request-scoped dependencies for the officer assistant tools. The agency is
 * always derived server-side (or validated for a ministry agent); tools never
 * accept an agency id from the model.
 */
export type OfficerToolDeps = {
  ctx: Context;
  userId: string;
  agencyId: string;
  agencyName: string | null;
  isMinistry: boolean;
  locale: AssistantLocale;
};

const DEFAULT_LIMIT = 10;
const HARD_LIMIT = 25;
const TEXT_MAX = 240;

function clampLimit(limit: number | undefined, fallback = DEFAULT_LIMIT, cap = HARD_LIMIT): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return fallback;
  }
  return Math.min(Math.max(1, Math.trunc(limit)), cap);
}

function truncateText(value: string | null | undefined, max = TEXT_MAX): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

/** Human-readable French summary of an obligation deadline rule. */
function summarizeDeadlineRule(rule: unknown): string | null {
  if (typeof rule !== "object" || rule === null || Array.isArray(rule)) {
    return null;
  }
  const value = rule as Record<string, unknown>;
  const type = typeof value.type === "string" ? value.type : null;
  if (!type) {
    return null;
  }
  const day = value.moralDay ?? value.day ?? value.physicalDay;
  switch (type) {
    case "monthly":
      return typeof day === "number" ? `Mensuelle, le ${day} du mois` : "Mensuelle";
    case "annual":
      return typeof value.day === "number" && typeof value.month === "number"
        ? `Annuelle, le ${value.day}/${value.month}`
        : "Annuelle";
    case "days_after_event":
      return typeof value.days === "number"
        ? `${value.days} jours après l'événement`
        : "Après événement";
    case "installments":
      return "Par tranches";
    default:
      return type;
  }
}

function frenchError(error: unknown): string {
  if (error instanceof ORPCError) {
    if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED") {
      return "Vous n'êtes pas autorisé à consulter cette information.";
    }
    if (error.code === "NOT_FOUND") {
      return "Aucune donnée correspondante n'a été trouvée.";
    }
    if (error.code === "BAD_REQUEST") {
      return error.message && /[éèêàçîôû]/.test(error.message)
        ? error.message
        : "La demande est invalide.";
    }
  }
  return "La consultation a échoué. Réessayez ou contactez un superviseur.";
}

/** Never let a tool throw: return a French error object the model can explain. */
async function read<T>(run: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await run();
  } catch (error) {
    return { error: frenchError(error) };
  }
}

async function requirePermission(
  deps: OfficerToolDeps,
  permission: AgencyPermission,
): Promise<void> {
  await assertAgencyPermission(deps.ctx, deps.agencyId, permission);
}

const submissionStatusSchema = z.enum([
  "draft",
  "queued",
  "in_review",
  "approved",
  "rejected",
  "returned",
  "escalated",
]);

const deadlineBucketSchema = z.enum(["overdue", "due_soon", "upcoming"]);

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

const registrySeveritySchema = z.enum(["warning", "error", "info"]);

export function createOfficerTools(deps: OfficerToolDeps): ToolSet {
  return {
    searchCompanies: tool({
      description:
        "Rechercher des entreprises de l'agence par nom, matricule fiscal ou identifiant unique. " +
        "Renvoie l'identifiant de l'entreprise à réutiliser dans les autres outils.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .describe("Nom de l'entreprise, matricule fiscal ou identifiant unique."),
        limit: z.number().int().min(1).max(HARD_LIMIT).optional(),
      }),
      execute: async ({ query, limit }) =>
        read(async () => {
          await requirePermission(deps, "officer.dossier.read");
          const result = await searchCompaniesForDossier(deps.ctx, {
            agencyId: deps.agencyId,
            query,
            limit: clampLimit(limit),
          });
          return {
            count: result.items.length,
            items: result.items.map((item) => ({
              companyId: item.companyId,
              legalName: item.legalName,
              uniqueIdentifier: item.uniqueIdentifier,
              legalForm: item.legalForm,
              taxId: item.taxId,
              registryState: item.registryState,
            })),
          };
        }),
    }),

    getCompanyProfile: tool({
      description:
        "Vue complète d'une entreprise en un seul appel : identité et éléments financiers, dossiers par agence, " +
        "obligations à venir, anomalies au registre, documents et historique des déclarations. " +
        "Utilisez l'identifiant renvoyé par searchCompanies.",
      inputSchema: z.object({
        companyId: z
          .string()
          .min(1)
          .describe("Identifiant de l'entreprise renvoyé par searchCompanies."),
      }),
      execute: async ({ companyId }) =>
        read(async () => {
          await requirePermission(deps, "officer.dossier.read");
          const dossier = await getCompanyDossier(deps.ctx, {
            agencyId: deps.agencyId,
            companyId,
          });

          const obligations = await listConditions(deps.ctx, {
            agencyId: deps.agencyId,
            companyId,
            limit: HARD_LIMIT,
          });

          await requirePermission(deps, "officer.registry.read");
          const flags = await listRegistryFlags(deps.ctx, {
            agencyId: deps.agencyId,
            limit: 200,
          });

          await requirePermission(deps, "officer.company_patterns.read");
          const patterns = await buildCompanyPatterns(deps.ctx, deps.agencyId, companyId);

          return {
            company: {
              id: dossier.company.id,
              legalName: dossier.company.legalName,
              uniqueIdentifier: dossier.company.uniqueIdentifier,
              legalForm: dossier.company.legalForm,
              registryState: dossier.company.registryState,
              status: dossier.company.status,
              fiscalDefault: dossier.company.fiscalDefault,
              capitalAmount: dossier.company.capitalAmount,
              currency: dossier.company.currency,
              mainActivityLabel: dossier.company.mainActivityLabel,
              activityStartDate: dossier.company.activityStartDate,
              lastFinancialStatementsDate: dossier.company.lastFinancialStatementsDate,
              lastBeneficialDeclarationDate: dossier.company.lastBeneficialDeclarationDate,
              taxId: dossier.company.taxId,
            },
            sections: dossier.sections.map((section) => ({
              agencyId: section.agencyId,
              agencyName: section.nameFr,
              submissions: section.submissions,
              pending: section.pending,
              findings: section.findings,
              filings: section.filings,
              documents: section.documents,
            })),
            obligations: {
              counts: obligations.counts,
              items: obligations.items.slice(0, 10).map((item) => ({
                obligation: item.obligationNameFr,
                code: item.obligationCode,
                periodicity: item.periodicity,
                dueDate: item.dueDate,
                daysRemaining: item.daysRemaining,
                bucket: item.bucket,
                legalBasis: item.legalBasis,
                penaltySummary: truncateText(item.penaltySummary),
              })),
            },
            registryAnomalies: flags.items
              .filter((flag) => flag.companyId === companyId)
              .slice(0, 10)
              .map((flag) => ({
                kind: flag.kind,
                severity: flag.severity,
                title: flag.title,
                detail: truncateText(flag.detail),
              })),
            submissions: {
              submissionCount: patterns.submissionCount,
              commonFindings: patterns.commonFindings.slice(0, 5),
              commonRejectionReasons: patterns.commonRejectionReasons.slice(0, 5),
            },
            documents: dossier.documents.slice(0, 10).map((document) => ({
              documentId: document.documentId,
              title: document.title,
              version: document.version,
              uploadedAt: document.uploadedAt,
              isCurrent: document.isCurrent,
            })),
          };
        }),
    }),

    getSubmissionDetail: tool({
      description:
        "Détail d'une déclaration : statut, propreté du dossier, anomalies détectées avec correction suggérée, " +
        "et historique des décisions.",
      inputSchema: z.object({
        submissionId: z.string().min(1).describe("Identifiant de la déclaration."),
      }),
      execute: async ({ submissionId }) =>
        read(async () => {
          await requirePermission(deps, "officer.review.read");
          const detail = await getOfficerSubmission(deps.ctx, {
            agencyId: deps.agencyId,
            submissionId,
          });
          return {
            submissionId: detail.submission.id,
            status: detail.submission.status,
            cleanlinessTier: detail.submission.cleanlinessTier,
            cleanlinessScore: detail.submission.cleanlinessScore,
            submittedAt: detail.submission.submittedAt,
            decidedAt: detail.submission.decidedAt,
            company: detail.company
              ? {
                  legalName: detail.company.legalName,
                  uniqueIdentifier: detail.company.uniqueIdentifier,
                }
              : null,
            findings: detail.findings.slice(0, 15).map((finding) => ({
              severity: finding.severity,
              code: finding.code,
              message: truncateText(finding.title),
              detail: truncateText(finding.messagePlain),
              suggestedFix: truncateText(finding.suggestedFix),
              status: finding.status,
            })),
            reviews: detail.reviews.slice(0, 10).map((review) => ({
              decision: review.decision,
              reason: truncateText(review.reason),
              decidedAt: review.decidedAt,
            })),
          };
        }),
    }),

    listQueue: tool({
      description:
        "File d'attente de l'agence : compteurs (total, hors délai, échéance proche, non affectés, renvoyés) " +
        "et principaux dossiers avec leur entreprise, date de dépôt et nombre d'anomalies.",
      inputSchema: z.object({
        status: submissionStatusSchema.optional(),
        slaBucket: z.enum(["on_time", "at_risk", "breached"]).optional(),
        assignment: z.enum(["all", "mine", "unassigned"]).optional(),
        limit: z.number().int().min(1).max(HARD_LIMIT).optional(),
      }),
      execute: async ({ status, slaBucket, assignment, limit }) =>
        read(async () => {
          await requirePermission(deps, "officer.queue.read");
          const result = await listOpsQueue(deps.ctx, {
            agencyId: deps.agencyId,
            status: status as Submission["status"] | undefined,
            slaBucket,
            assignment,
            limit: clampLimit(limit),
          });
          return {
            counts: {
              total: result.counts.total,
              horsDelai: result.counts.breached,
              echeanceProche: result.counts.atRisk,
              nonAffectes: result.counts.unassigned,
              renvoyes: result.counts.returned,
            },
            items: result.items.map((item) => ({
              submissionId: item.id,
              company: item.company?.legalName ?? null,
              uniqueIdentifier: item.company?.uniqueIdentifier ?? null,
              status: item.status,
              submittedAt: item.submittedAt,
              slaBucket: item.slaBucket,
              assignee: item.assigneeName,
              findingsCount: item.findingsCount,
              blockers: item.blockers,
            })),
          };
        }),
    }),

    listUpcomingDeadlines: tool({
      description:
        "Échéances des obligations de l'agence (en retard, proches ou à venir) avec la date, les jours restants, " +
        "la base légale et un résumé des pénalités.",
      inputSchema: z.object({
        bucket: deadlineBucketSchema.optional(),
        companyId: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(HARD_LIMIT).optional(),
      }),
      execute: async ({ bucket, companyId, limit }) =>
        read(async () => {
          await requirePermission(deps, "officer.conditions.read");
          const result = await listConditions(deps.ctx, {
            agencyId: deps.agencyId,
            companyId,
            bucket,
            limit: clampLimit(limit),
          });
          return {
            counts: result.counts,
            items: result.items.map((item) => ({
              company: item.companyName,
              uniqueIdentifier: item.uniqueIdentifier,
              obligation: item.obligationNameFr,
              code: item.obligationCode,
              periodicity: item.periodicity,
              dueDate: item.dueDate,
              daysRemaining: item.daysRemaining,
              bucket: item.bucket,
              legalBasis: item.legalBasis,
              penaltySummary: truncateText(item.penaltySummary),
            })),
          };
        }),
    }),

    listRegistryAnomalies: tool({
      description:
        "Anomalies de cohérence au registre : intitulé, détail et gravité, pour chaque entreprise concernée.",
      inputSchema: z.object({
        kind: registryFlagKindSchema.optional(),
        severity: registrySeveritySchema.optional(),
        limit: z.number().int().min(1).max(HARD_LIMIT).optional(),
      }),
      execute: async ({ kind, severity, limit }) =>
        read(async () => {
          await requirePermission(deps, "officer.registry.read");
          const result = await listRegistryFlags(deps.ctx, {
            agencyId: deps.agencyId,
            kind,
            severity,
            limit: clampLimit(limit),
          });
          return {
            counts: result.counts,
            items: result.items.map((flag) => ({
              company: flag.companyName,
              uniqueIdentifier: flag.uniqueIdentifier,
              kind: flag.kind,
              severity: flag.severity,
              title: flag.title,
              detail: truncateText(flag.detail),
            })),
          };
        }),
    }),

    lookupObligations: tool({
      description:
        "Catalogue des obligations légales de l'agence : nom, périodicité, base légale, " +
        "règle d'échéance résumée et pénalités. Optionnellement filtré par mots-clés.",
      inputSchema: z.object({
        query: z.string().min(1).optional().describe("Mots-clés, par exemple « TVA » ou « CNSS »."),
        limit: z.number().int().min(1).max(HARD_LIMIT).optional(),
      }),
      execute: async ({ query, limit }) =>
        read(async () => {
          await requirePermission(deps, "officer.conditions.read");
          const rows = await listActiveObligations(deps.ctx.db, deps.agencyId);
          const needle = query?.trim().toLowerCase() ?? "";
          const filtered =
            needle.length > 0
              ? rows.filter((row) =>
                  [row.nameFr, row.nameAr, row.code, row.legalBasis].some(
                    (value) => typeof value === "string" && value.toLowerCase().includes(needle),
                  ),
                )
              : rows;
          const bounded = filtered.slice(0, clampLimit(limit, 15));
          return {
            count: bounded.length,
            obligations: bounded.map((row) => ({
              code: row.code,
              name: row.nameFr,
              periodicity: row.periodicity,
              legalBasis: row.legalBasis,
              deadlineRule: summarizeDeadlineRule(row.deadlineRule),
              penaltySummary: truncateText(row.penaltySummary),
            })),
          };
        }),
    }),

    getTeamWorkload: tool({
      description:
        "Charge de travail de l'équipe de l'agence : agents actifs, dossiers ouverts et délai moyen de décision. " +
        "N'est exploitable que pour un superviseur ou un administrateur.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const workload = await getTeamWorkloadService(deps.ctx, { agencyId: deps.agencyId });
          return {
            totals: workload.totals,
            members: workload.members.slice(0, HARD_LIMIT).map((member) => ({
              name: member.displayName,
              email: member.email,
              role: member.role,
              openCount: member.openCount,
              decidedCount: member.decidedCount,
              avgDecisionHours: member.avgDecisionHours,
            })),
          };
        } catch (error) {
          if (
            error instanceof ORPCError &&
            (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
          ) {
            return { error: "non autorisé pour ce profil" };
          }
          return { error: frenchError(error) };
        }
      },
    }),
  };
}

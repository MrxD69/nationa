import { tool, type ToolSet } from "ai";
import { z } from "zod";

import type { AssistantToolDeps, CitationPayload } from "../../ai/types";
import { insertAiActivityEvent, insertAiCitation, insertProposal } from "../repositories/ai.repo";
import {
  findRuleCitationById,
  listActiveObligations,
  loadCaseCompanyId,
  loadCompany,
  lookupObligationCatalog,
  searchRuleCitations,
  toCompanyProfile,
} from "../repositories/knowledge.repo";

const ruleIdSchema = z.guid();
const companyIdSchema = z.string().min(1);

function isAccessible(deps: AssistantToolDeps, companyId: string): boolean {
  return deps.accessibleCompanyIds.includes(companyId);
}

export type AssistantToolName =
  | "searchRules"
  | "lookupObligations"
  | "getCompanyProfile"
  | "getUpcomingDeadlines"
  | "citeRule"
  | "proposeCaseFieldFills"
  | "requestClarification"
  | "flagDelicateMatter";

export function createAssistantTools(deps: AssistantToolDeps): ToolSet {
  return {
    searchRules: tool({
      description:
        "Search the official rule citation catalog (laws, articles, code references). " +
        "Call this before making any legal or fiscal statement.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Free-text keywords, e.g. 'TVA déclaration mensuelle'."),
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: async ({ query, limit }) => {
        const results = await searchRuleCitations(deps.ctx.db, { query, limit });
        return {
          count: results.length,
          results: results.map((rule) => ({
            ruleCitationId: rule.id,
            source: rule.source,
            article: rule.article,
            titleFr: rule.titleFr,
            titleAr: rule.titleAr,
            url: rule.url,
          })),
        };
      },
    }),

    lookupObligations: tool({
      description:
        "Look up active regulatory obligations (DGI, CNSS, RNE, ...) with their periodicity and deadline rules.",
      inputSchema: z.object({
        query: z.string().min(1).optional(),
        agencyId: z.string().min(1).optional().describe("Agency id such as DGI or CNSS."),
        limit: z.number().int().min(1).max(30).optional(),
      }),
      execute: async ({ query, agencyId, limit }) => {
        const results = await lookupObligationCatalog(deps.ctx.db, { query, agencyId, limit });
        return { count: results.length, obligations: results };
      },
    }),

    getCompanyProfile: tool({
      description:
        "Read the registry and fiscal profile of a company the user can access. Defaults to the current company.",
      inputSchema: z.object({
        companyId: companyIdSchema.optional(),
      }),
      execute: async ({ companyId }) => {
        const target = companyId ?? deps.companyId;
        if (!target) {
          return { error: "NO_COMPANY_CONTEXT" };
        }
        if (!isAccessible(deps, target)) {
          return { error: "FORBIDDEN", companyId: target };
        }
        const company = await loadCompany(deps.ctx.db, target);
        if (!company) {
          return { error: "NOT_FOUND", companyId: target };
        }
        return { company: toCompanyProfile(company) };
      },
    }),

    getUpcomingDeadlines: tool({
      description:
        "List the active obligations and deadline rules that apply to a company the user can access.",
      inputSchema: z.object({
        companyId: companyIdSchema.optional(),
        agencyId: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(30).optional(),
      }),
      execute: async ({ companyId, agencyId, limit }) => {
        const target = companyId ?? deps.companyId;
        if (target && !isAccessible(deps, target)) {
          return { error: "FORBIDDEN", companyId: target };
        }
        const results = await listActiveObligations(deps.ctx.db, {
          agencyId,
          limit: limit ?? 12,
        });
        return { companyId: target ?? null, count: results.length, deadlines: results };
      },
    }),

    citeRule: tool({
      description:
        "Attach an official rule citation to the current answer. This is the only way to produce a citation. " +
        "Use a ruleCitationId returned by searchRules.",
      inputSchema: z.object({
        ruleCitationId: ruleIdSchema,
        snippet: z.string().max(2000).optional(),
      }),
      execute: async ({
        ruleCitationId,
        snippet,
      }): Promise<CitationPayload | { error: string }> => {
        const rule = await findRuleCitationById(deps.ctx.db, ruleCitationId);
        if (!rule) {
          return { error: "NOT_FOUND" };
        }

        await insertAiCitation(deps.ctx.db, {
          messageId: deps.messageId,
          ruleCitationId: rule.id,
          snippet: snippet ?? null,
        });

        return {
          id: rule.id,
          source: rule.source,
          article: rule.article,
          titleFr: rule.titleFr,
          titleAr: rule.titleAr,
          textFr: rule.textFr,
          textAr: rule.textAr,
          url: rule.url,
        };
      },
    }),

    proposeCaseFieldFills: tool({
      description:
        "Propose values for case fields. This only creates a draft proposal for the user to accept; it never applies changes.",
      inputSchema: z.object({
        caseId: z.guid().optional(),
        rationale: z.string().max(2000).optional(),
        fields: z
          .array(
            z.object({
              fieldKey: z.string().min(1),
              label: z.string().optional(),
              valueText: z.string().nullish(),
              valueJsonb: z.unknown().optional(),
              confidence: z.number().min(0).max(1).nullish(),
            }),
          )
          .min(1),
      }),
      execute: async ({ caseId, rationale, fields }) => {
        const targetCaseId = caseId ?? deps.caseId;
        if (!targetCaseId) {
          return { error: "NO_CASE_CONTEXT" };
        }
        const caseCompanyId = await loadCaseCompanyId(deps.ctx.db, targetCaseId);
        if (!caseCompanyId || !isAccessible(deps, caseCompanyId)) {
          return { error: "FORBIDDEN", caseId: targetCaseId };
        }

        const proposal = await insertProposal(deps.ctx.db, {
          conversationId: deps.conversationId,
          messageId: deps.messageId,
          subjectType: "case",
          subjectId: targetCaseId,
          kind: "case_field_fills",
          status: "draft",
          payload: { caseId: targetCaseId, fields },
          rationale: rationale ?? null,
        });

        return {
          proposalId: proposal?.id ?? null,
          subjectType: "case",
          subjectId: targetCaseId,
          kind: "case_field_fills",
          status: "draft",
          fieldCount: fields.length,
          fields: fields.map((field) => field.fieldKey),
          note: "Draft proposal created. The user must accept it before any field is applied.",
        };
      },
    }),

    requestClarification: tool({
      description:
        "Ask the user structured clarifying questions when required information is missing or ambiguous. Never guess.",
      inputSchema: z.object({
        questions: z
          .array(
            z.object({
              id: z.string().min(1).optional(),
              question: z.string().min(1),
              options: z.array(z.string().min(1)).optional(),
            }),
          )
          .min(1),
      }),
      execute: async ({ questions }) => ({ needsClarification: true, questions }),
    }),

    flagDelicateMatter: tool({
      description:
        "Raise a visible warning about a delicate or high-risk matter (litigation, fiscal default, fraud, sanctions, imminent deadline).",
      inputSchema: z.object({
        summary: z.string().min(1),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        reasons: z.array(z.string().min(1)).optional(),
      }),
      execute: async ({ summary, severity, reasons }) => {
        await insertAiActivityEvent(deps.ctx.db, {
          actorUserId: deps.userId,
          actorType: "ai",
          entityType: "ai_conversation",
          action: "ai.delicate_matter_flagged",
          summary,
          data: { severity: severity ?? "warning", reasons: reasons ?? [] },
        });
        return { flagged: true, severity: severity ?? "warning", summary, reasons: reasons ?? [] };
      },
    }),
  };
}

import { generateObject } from "ai";
import { z } from "zod";

import type { DocumentKind } from "../domain/extraction";
import type { Context } from "../rpc/context";
import { listCatalogTemplates } from "../rpc/repositories/actions.repo";
import {
  insertProposal,
  listDraftProposalsBySubject,
  supersedeDraftProposals,
} from "../rpc/repositories/ai.repo";
import { notify } from "../rpc/services/notifications.service";

export const RECOMMENDED_DEMARCHE_KIND = "recommended_demarche";

const MAX_CANDIDATES = 40;
const PRIORITY_AGENCIES = ["RNE", "DGI", "APII"];
const MAX_REASON_LENGTH = 160;

const recommendationSchema = z.object({
  recommendations: z
    .array(
      z.object({
        code: z.string().describe("A template `code` from the candidate list."),
        reason: z.string().describe("One short French sentence explaining why it fits."),
      }),
    )
    .max(3)
    .describe("1 to 3 recommended démarches, most relevant first."),
});

const INSTRUCTIONS = [
  "You are a Tunisian administrative-procedures assistant.",
  "Given a document uploaded by a company, choose the 1 to 3 most relevant démarche templates from the candidate list.",
  "Non-negotiable rules:",
  "- Only use `code` values that appear exactly in the candidate list. Never invent or translate a code.",
  "- Return at most 3 recommendations, ordered most relevant first.",
  "- Write each `reason` in French as one short, concrete sentence tied to the document.",
].join("\n");

type CandidateTemplate = Awaited<ReturnType<typeof listCatalogTemplates>>[number];

export type RecommendDemarchesInput = {
  companyId: string;
  documentId: string;
  kind: DocumentKind;
  output: unknown;
};

function truncate(value: string | null | undefined, max = 140): string {
  if (!value) {
    return "";
  }
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function candidateScore(template: CandidateTemplate): number {
  const haystack = `${template.agencyId} ${template.code}`.toUpperCase();
  const index = PRIORITY_AGENCIES.findIndex((agency) => haystack.includes(agency));
  return index === -1 ? PRIORITY_AGENCIES.length : index;
}

function selectCandidates(templates: CandidateTemplate[]): CandidateTemplate[] {
  return [...templates]
    .sort((left, right) => candidateScore(left) - candidateScore(right))
    .slice(0, MAX_CANDIDATES);
}

function readPayloadCodes(payload: unknown): string[] {
  const record =
    typeof payload === "string"
      ? (() => {
          try {
            return JSON.parse(payload) as unknown;
          } catch {
            return null;
          }
        })()
      : payload;
  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    return [];
  }
  const raw = (record as Record<string, unknown>).codes;
  const list =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return [];
          }
        })()
      : raw;
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((entry): entry is string => typeof entry === "string");
}

function trimOutput(output: unknown): unknown {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return output;
  }
  const record = output as Record<string, unknown>;
  const lines = record.lines;
  if (Array.isArray(lines) && lines.length > 10) {
    return { ...record, lines: lines.slice(0, 10) };
  }
  return record;
}

function buildPrompt(input: RecommendDemarchesInput, candidates: CandidateTemplate[]): string {
  const catalog = candidates
    .map((template) => `${template.code} — ${template.nameFr} — ${truncate(template.description)}`)
    .join("\n");

  return [
    `Uploaded document kind: ${input.kind}`,
    "",
    "Extracted document content (JSON):",
    JSON.stringify(trimOutput(input.output), null, 2),
    "",
    "Candidate démarche templates (code — French name — description):",
    catalog,
  ].join("\n");
}

/**
 * Best-effort AI step: reads extracted document content, picks 1-3 relevant
 * démarche templates and stores them as a draft `ai_proposals` row for the company.
 * Never throws — returns null when no model output or no valid candidate remains.
 */
export async function recommendDemarches(
  context: Context,
  input: RecommendDemarchesInput,
): Promise<{ codes: string[] } | null> {
  try {
    const templates = await listCatalogTemplates(context.db);
    if (templates.length === 0) {
      return null;
    }
    const candidates = selectCandidates(templates);

    const result = await generateObject({
      model: context.ai.model,
      schema: recommendationSchema,
      schemaName: "DémarcheRecommendations",
      schemaDescription:
        "The 1 to 3 Tunisian administrative démarches recommended for a company based on a document, each with its template code and a short French reason.",
      instructions: INSTRUCTIONS,
      prompt: buildPrompt(input, candidates),
    });

    const validCodes = new Set(candidates.map((template) => template.code));
    const seen = new Set<string>();
    const recommended: Array<{ code: string; reason: string }> = [];
    for (const entry of result.object.recommendations) {
      const code = entry.code.trim();
      if (!validCodes.has(code) || seen.has(code)) {
        continue;
      }
      seen.add(code);
      recommended.push({ code, reason: truncate(entry.reason.trim(), MAX_REASON_LENGTH) });
    }

    if (recommended.length === 0) {
      return null;
    }

    const codes = recommended.map((entry) => entry.code);
    const reasons: Record<string, string> = {};
    for (const entry of recommended) {
      reasons[entry.code] = entry.reason;
    }

    const previous = await listDraftProposalsBySubject(context.db, {
      subjectType: "company",
      subjectId: input.companyId,
      kind: RECOMMENDED_DEMARCHE_KIND,
    });
    const previousCodes = new Set<string>();
    for (const proposal of previous) {
      for (const code of readPayloadCodes(proposal.payload)) {
        previousCodes.add(code);
      }
    }

    await supersedeDraftProposals(context.db, {
      subjectType: "company",
      subjectId: input.companyId,
      kind: RECOMMENDED_DEMARCHE_KIND,
    });

    await insertProposal(context.db, {
      subjectType: "company",
      subjectId: input.companyId,
      kind: RECOMMENDED_DEMARCHE_KIND,
      status: "draft",
      payload: { codes, reasons, sourceDocumentId: input.documentId },
      rationale: recommended.map((entry) => `${entry.code}: ${entry.reason}`).join(" | "),
    });

    const differs =
      codes.length !== previousCodes.size || codes.some((code) => !previousCodes.has(code));
    if (differs && context.user?.id) {
      try {
        await notify(context, {
          userId: context.user.id,
          companyId: input.companyId,
          type: "system",
          title: "Nouvelles démarches recommandées",
          body: codes.join(", "),
          entityType: "company",
          entityId: input.companyId,
        });
      } catch {
        // Best-effort; never fail extraction because of a notification.
      }
    }

    return { codes };
  } catch {
    return null;
  }
}

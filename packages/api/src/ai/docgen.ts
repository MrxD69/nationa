import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

import type { DocLang, DocumentTemplateDef } from "../documents/templates/types";
import type { CitationPayload } from "./types";

export const docgenDraftSchema = z.object({
  fields: z
    .array(
      z.object({
        key: z.string().describe("The template field key this value belongs to."),
        valueText: z.string().nullish().describe("Plain-text value, null when unknown."),
        valueJsonb: z
          .union([
            z.string(),
            z.number(),
            z.boolean(),
            z.record(z.string(), z.unknown()),
            z.array(z.unknown()),
          ])
          .nullish()
          .describe("Structured value (e.g. an address object) when a plain string is not enough."),
        citingKeys: z
          .array(z.string())
          .describe("Rule citation ids from the provided catalog that justify this value."),
        confidence: z.number().min(0).max(1).nullish(),
      }),
    )
    .describe(
      "Values the model could fill for known template fields. Omit fields that stay blank.",
    ),
  questions: z
    .array(
      z.object({
        id: z.string(),
        key: z.string().nullish().describe("Template field key the question resolves."),
        question: z.string(),
        options: z.array(z.string()).nullish(),
      }),
    )
    .describe("Questions to ask the user for missing data. Never guess: ask instead."),
  missingKeys: z.array(z.string()).describe("Template field keys that remain unknown."),
  additionalClauses: z
    .array(
      z.object({
        title: z.string(),
        text: z.string(),
        citingKeys: z.array(z.string()),
      }),
    )
    .describe("Optional extra clauses, each backed by provided rule citation ids."),
  rationale: z.string().nullish(),
  delicateFlags: z
    .array(
      z.object({
        summary: z.string(),
        severity: z.enum(["info", "warning", "critical"]).nullish(),
        reasons: z.array(z.string()).nullish(),
      }),
    )
    .describe("Sensitive or high-risk situations worth surfacing to the user."),
});

export type DocgenAiOutput = z.infer<typeof docgenDraftSchema>;

export type DocgenAiFieldInput = {
  key: string;
  labelFr: string | null;
  labelAr: string | null;
  valueText: string | null;
  valueJsonb?: unknown;
  sourceKind: string;
};

export type DocgenAiDeps = {
  model: LanguageModel;
  language: DocLang;
  template: DocumentTemplateDef;
  fields: DocgenAiFieldInput[];
  citations: CitationPayload[];
};

function languageLabel(language: DocLang): string {
  return language === "ar" ? "Arabic" : "French";
}

function buildInstructions(deps: DocgenAiDeps): string {
  const citationIds = deps.citations.map((citation) => citation.id);
  return [
    "You are a Tunisian corporate-documents drafting assistant (RNE, DGI).",
    `Write every generated value in ${languageLabel(deps.language)}.`,
    "",
    "Non-negotiable rules:",
    "- You NEVER decide, validate, submit or file anything on the user's behalf.",
    "- You NEVER invent a law, article, tax rate or deadline. Only cite rule citation ids provided below.",
    "- Every `citingKey` MUST be one of the provided rule citation ids. Do not fabricate ids or sources.",
    "- If a value is unknown, ambiguous or not present in the provided context, leave it null and add a question instead of guessing.",
    "- `additionalClauses` are optional; only add a clause when it is directly supported by a provided citation.",
    "- Flag delicate matters (litigation, fiscal default, fraud, sanctions, imminent deadline) in `delicateFlags`.",
    "",
    citationIds.length > 0
      ? `Allowed rule citation ids (use only these): ${citationIds.join(", ")}`
      : "No rule citations were provided. Do not cite anything; ask questions instead.",
  ].join("\n");
}

function buildPrompt(deps: DocgenAiDeps): string {
  const citationCatalog = deps.citations.map((citation) => ({
    id: citation.id,
    source: citation.source,
    article: citation.article,
    titleFr: citation.titleFr,
    titleAr: citation.titleAr,
  }));

  const templateOutline = deps.template.sections.map((section) => ({
    id: section.id,
    title: section.title,
    fields: section.blocks.flatMap((block) => {
      if (block.type === "field") {
        return [{ key: block.key, label: block.label, required: block.required ?? false }];
      }
      if (block.type === "repeat") {
        return block.fields.map((field) => ({
          key: field.key,
          label: field.label,
          required: field.required ?? false,
          repeat: block.key,
        }));
      }
      return [];
    }),
  }));

  return [
    `Template: ${deps.template.code} (v${deps.template.version}).`,
    `Document type: ${deps.template.documentTypeCode}.`,
    "",
    "Template outline:",
    JSON.stringify(templateOutline, null, 2),
    "",
    "Known field values (already resolved from case records, company registry and documents):",
    JSON.stringify(deps.fields, null, 2),
    "",
    "Rule citation catalog (cite only these ids):",
    JSON.stringify(citationCatalog, null, 2),
    "",
    "Fill the known fields you are confident about, ask one question per missing required field, and list every remaining unknown key in `missingKeys`.",
  ].join("\n");
}

export async function generateDocDraft(deps: DocgenAiDeps): Promise<DocgenAiOutput> {
  const result = await generateObject({
    model: deps.model,
    schema: docgenDraftSchema,
    schemaName: "DocumentDraft",
    schemaDescription:
      "A structured draft for an official Tunisian document: resolved fields with citations, questions for missing data, optional clauses and delicate-matter flags.",
    instructions: buildInstructions(deps),
    prompt: buildPrompt(deps),
  });

  return result.object;
}

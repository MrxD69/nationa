import { ORPCError } from "@orpc/server";

import type { AiProposal, Company, JsonObject, NewFieldProvenance, Person } from "@nationa/db";

import { generateDocDraft, type DocgenAiOutput } from "../../ai/docgen";
import type { AiFieldWrite, CitationPayload } from "../../ai/types";
import { assertCompanyPermission, requireUser } from "../../auth/access";
import {
  FIELD_LABELS,
  COMPANY_FIELD_KEYS,
  PERSON_FIELD_KEYS,
  type CanonicalFieldKey,
} from "../../domain/fields";
import {
  getDocumentTemplate,
  listDocumentTemplates,
  renderDocument,
  templateFieldKeys,
  templateRepeatKeys,
  wrapHtmlDocument,
  type DocLang,
  type DocumentTemplateDef,
  type RenderCitation,
  type RenderFieldValue,
} from "../../documents/templates";
import type { Context } from "../context";
import * as repo from "../repositories/docgen.repo";
import { recordActivity } from "./activity.service";
import { emitCaseEvent } from "./case-activity.service";
import { requireCasePermission } from "./cases.service";

export const DOCGEN_PROPOSAL_KIND = "document_draft";

const COMPANY_FIELD_KEY_SET = new Set<string>(COMPANY_FIELD_KEYS);
const PERSON_FIELD_KEY_SET = new Set<string>(PERSON_FIELD_KEYS);

const CITATION_KEY_SOURCES: Record<string, string> = {
  code_commerce_modifications_statutaires: "Code de commerce tunisien",
  code_commerce_art_17_etats_financiers: "Code de commerce tunisien",
  loi_beneficiaire_effectif: "2016-48",
  code_irpp_is_declarations: "Code de l'IRPP et de l'IS",
  loi52_2018_art_6_immatriculation: "2018-52",
};

export type DocgenSourceKind = "user" | "document" | "ai" | "import" | "system" | "blank";

export type DocgenMode = "template" | "ai";

export type DocgenField = {
  key: string;
  labelFr: string;
  labelAr: string;
  valueText: string | null;
  valueJsonb: unknown;
  sourceKind: DocgenSourceKind;
  confidence: number | null;
  citingKeys: string[];
  questionId: string | null;
  format?: "text" | "longtext" | "date" | "number" | "currency" | "address";
};

export type DocgenRepeat = {
  key: string;
  items: Array<Record<string, DocgenField>>;
};

export type DocgenQuestion = {
  id: string;
  key: string | null;
  question: string;
  options: string[];
};

export type DocgenCitation = {
  id: string;
  source: string;
  article: string | null;
  titleFr: string | null;
  titleAr: string | null;
  textFr: string | null;
  textAr: string | null;
  url: string | null;
  snippet: string | null;
};

export type DocgenDraftPayload = {
  templateCode: string;
  templateVersion: number;
  documentTypeCode: string;
  language: DocLang;
  mode: DocgenMode;
  caseId: string | null;
  companyId: string | null;
  stepId: string | null;
  fields: DocgenField[];
  repeats: DocgenRepeat[];
  questions: DocgenQuestion[];
  missingKeys: string[];
  additionalClauses: Array<{ title: string; text: string; citingKeys: string[] }>;
  rationale: string | null;
  delicateFlags: Array<{ summary: string; severity: string; reasons: string[] }>;
  citations: DocgenCitation[];
  citationAliases: Record<string, string>;
  render: { markdown: string; html: string };
  approvedDocumentId?: string | null;
  approvedVersionId?: string | null;
  approvedStorageKey?: string | null;
};

export type DocgenDraftView = {
  proposal: {
    id: string;
    subjectType: string;
    subjectId: string;
    kind: string;
    status: string;
    rationale: string | null;
    createdAt: Date;
  };
  payload: DocgenDraftPayload;
};

export type DocumentContextView = {
  template: DocumentTemplateDef;
  caseId: string | null;
  companyId: string | null;
  fields: DocgenField[];
  repeats: DocgenRepeat[];
  missingKeys: string[];
};

export type DocgenPromptContext = {
  proposalId: string;
  templateCode: string;
  documentTypeCode: string;
  language: DocLang;
  fields: Array<{
    key: string;
    labelFr: string | null;
    valueText: string | null;
    sourceKind: string;
  }>;
  repeats: Array<{
    key: string;
    items: Array<Record<string, { key: string; valueText: string | null; sourceKind: string }>>;
  }>;
  missingKeys: string[];
  citations: Array<{ id: string; source: string; article: string | null; titleFr: string | null }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPayload(value: unknown): DocgenDraftPayload {
  return (isRecord(value) ? value : {}) as unknown as DocgenDraftPayload;
}

function localized(text: { fr: string; ar: string }, language: DocLang): string {
  return language === "ar" ? text.ar : text.fr;
}

function collectFieldFormats(
  template: DocumentTemplateDef,
): Map<string, NonNullable<DocgenField["format"]>> {
  const formats = new Map<string, NonNullable<DocgenField["format"]>>();
  for (const section of template.sections) {
    for (const block of section.blocks) {
      if (block.type === "field") {
        formats.set(block.key, block.format ?? "text");
      } else if (block.type === "repeat") {
        for (const field of block.fields) {
          formats.set(field.key, field.format ?? "text");
        }
      }
    }
  }
  return formats;
}

function fieldLabels(key: string): { labelFr: string; labelAr: string } {
  const labels = FIELD_LABELS[key as CanonicalFieldKey];
  if (!labels) {
    return { labelFr: key, labelAr: key };
  }
  return { labelFr: labels.fr, labelAr: labels.ar ?? labels.fr };
}

function hasFieldValue(field: DocgenField): boolean {
  if (typeof field.valueText === "string" && field.valueText.trim().length > 0) {
    return true;
  }
  if (field.valueJsonb === null || field.valueJsonb === undefined) {
    return false;
  }
  if (typeof field.valueJsonb === "string") {
    return field.valueJsonb.trim().length > 0;
  }
  if (Array.isArray(field.valueJsonb)) {
    return field.valueJsonb.length > 0;
  }
  if (isRecord(field.valueJsonb)) {
    return Object.keys(field.valueJsonb).length > 0;
  }
  return true;
}

function toConfidence(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNumericString(value: number | null): string | null {
  return value === null ? null : value.toFixed(2);
}

function readCompanyField(
  company: Company,
  key: string,
): { valueText: string | null; valueJsonb: unknown } | null {
  switch (key) {
    case "legalName":
      return { valueText: company.legalName, valueJsonb: null };
    case "legalNameAr":
      return { valueText: company.legalNameAr, valueJsonb: null };
    case "tradeName":
      return { valueText: company.tradeName, valueJsonb: null };
    case "brandName":
      return { valueText: company.brandName, valueJsonb: null };
    case "legalForm":
      return { valueText: company.legalForm, valueJsonb: null };
    case "capitalAmount":
      return { valueText: company.capitalAmount, valueJsonb: null };
    case "currency":
      return { valueText: company.currency, valueJsonb: null };
    case "durationYears":
      return {
        valueText: company.durationYears === null ? null : String(company.durationYears),
        valueJsonb: null,
      };
    case "publicationDate":
      return { valueText: company.publicationDate, valueJsonb: null };
    case "headquartersAddress":
      return { valueText: null, valueJsonb: company.headquartersAddress };
    case "activityAddress":
      return { valueText: null, valueJsonb: company.activityAddress };
    case "mainActivityLabel":
      return { valueText: company.mainActivityLabel, valueJsonb: null };
    case "mainActivityLabelAr":
      return { valueText: company.mainActivityLabelAr, valueJsonb: null };
    case "mainActivityCode":
      return { valueText: company.mainActivityCode, valueJsonb: null };
    case "activityStartDate":
      return { valueText: company.activityStartDate, valueJsonb: null };
    case "registryState":
      return { valueText: company.registryState, valueJsonb: null };
    case "secondaryEstablishmentsCount":
      return {
        valueText:
          company.secondaryEstablishmentsCount === null
            ? null
            : String(company.secondaryEstablishmentsCount),
        valueJsonb: null,
      };
    case "leasing":
      return { valueText: String(company.leasing), valueJsonb: null };
    case "hasPledge":
      return { valueText: String(company.hasPledge), valueJsonb: null };
    case "fiscalDefault":
      return { valueText: company.fiscalDefault, valueJsonb: null };
    case "mentionDate":
      return { valueText: company.mentionDate, valueJsonb: null };
    case "uniqueIdentifier":
      return { valueText: company.uniqueIdentifier, valueJsonb: null };
    case "internalManagementNumber":
      return { valueText: company.internalManagementNumber, valueJsonb: null };
    case "registryType":
      return { valueText: company.registryType, valueJsonb: null };
    case "taxId":
      return { valueText: company.taxId, valueJsonb: null };
    default:
      return null;
  }
}

function readPersonField(
  person: Person,
  key: string,
): { valueText: string | null; valueJsonb: unknown } | null {
  switch (key) {
    case "fullName":
      return { valueText: person.fullName, valueJsonb: null };
    case "fullNameAr":
      return { valueText: person.fullNameAr, valueJsonb: null };
    case "firstName":
      return { valueText: person.firstName, valueJsonb: null };
    case "lastName":
      return { valueText: person.lastName, valueJsonb: null };
    case "nationalId":
      return { valueText: person.nationalId, valueJsonb: null };
    case "nationality":
      return { valueText: person.nationality, valueJsonb: null };
    case "birthDate":
      return { valueText: person.birthDate, valueJsonb: null };
    case "gender":
      return { valueText: person.gender, valueJsonb: null };
    case "email":
      return { valueText: person.email, valueJsonb: null };
    case "phone":
      return { valueText: person.phone, valueJsonb: null };
    case "address":
      return { valueText: null, valueJsonb: person.address };
    default:
      return null;
  }
}

function toCitation(rule: {
  id: string;
  source: string;
  article: string | null;
  titleFr: string | null;
  titleAr: string | null;
  textFr: string | null;
  textAr: string | null;
  url: string | null;
}): DocgenCitation {
  return {
    id: rule.id,
    source: rule.source,
    article: rule.article,
    titleFr: rule.titleFr,
    titleAr: rule.titleAr,
    textFr: rule.textFr,
    textAr: rule.textAr,
    url: rule.url,
    snippet: null,
  };
}

function toCitationPayload(citation: DocgenCitation): CitationPayload {
  return {
    id: citation.id,
    source: citation.source,
    article: citation.article,
    titleFr: citation.titleFr,
    titleAr: citation.titleAr,
    textFr: citation.textFr,
    textAr: citation.textAr,
    url: citation.url,
  };
}

async function loadTemplateOrThrow(code: string): Promise<DocumentTemplateDef> {
  const template = getDocumentTemplate(code);
  if (!template) {
    throw new ORPCError("NOT_FOUND", { message: `Unknown document template: ${code}` });
  }
  return template;
}

export function listTemplates(ctx: Context) {
  requireUser(ctx);
  return listDocumentTemplates().map((template) => ({
    code: template.code,
    version: template.version,
    documentTypeCode: template.documentTypeCode,
    title: template.title,
    description: template.description,
    defaultLanguage: template.defaultLanguage,
    sectionCount: template.sections.length,
    fieldKeys: templateFieldKeys(template),
  }));
}

export function getTemplate(ctx: Context, input: { code: string }) {
  requireUser(ctx);
  return loadTemplateOrThrow(input.code);
}

async function authorizeScopeRead(
  ctx: Context,
  input: { caseId?: string; companyId?: string },
): Promise<void> {
  if (input.companyId) {
    await assertCompanyPermission(ctx, input.companyId, "documents.read");
    return;
  }
  if (input.caseId) {
    await requireCasePermission(ctx, input.caseId, "documents.read");
    return;
  }
  requireUser(ctx);
}

async function authorizeScopeWrite(
  ctx: Context,
  input: { caseId?: string; companyId?: string },
): Promise<string | null> {
  if (input.caseId) {
    const caseRecord = await requireCasePermission(ctx, input.caseId, "documents.write");
    return caseRecord.companyId ?? input.companyId ?? null;
  }
  if (input.companyId) {
    await assertCompanyPermission(ctx, input.companyId, "documents.generate");
    return input.companyId;
  }
  throw new ORPCError("BAD_REQUEST", { message: "A caseId or companyId is required" });
}

export async function resolveDocumentContext(
  ctx: Context,
  input: { templateCode: string; caseId?: string; companyId?: string },
): Promise<DocumentContextView> {
  const template = await loadTemplateOrThrow(input.templateCode);

  let caseRecord = null;
  if (input.caseId) {
    caseRecord = await repo.findCaseById(ctx.db, input.caseId);
    if (!caseRecord) {
      throw new ORPCError("NOT_FOUND", { message: "Case not found" });
    }
  }

  const companyId = input.companyId ?? caseRecord?.companyId ?? null;
  const company = companyId ? await repo.findCompanyById(ctx.db, companyId) : null;

  const caseFieldRows = input.caseId ? await repo.listCaseFieldValues(ctx.db, input.caseId) : [];
  const caseFieldsByKey = new Map(caseFieldRows.map((row) => [row.fieldKey, row]));

  let person: Person | null = null;
  if (caseRecord?.applicantPersonId) {
    person = await repo.findPersonById(ctx.db, caseRecord.applicantPersonId);
  }
  const people = companyId ? await repo.listCompanyPersons(ctx.db, companyId) : [];
  if (!person) {
    person = people[0] ?? null;
  }

  const formatByKey = collectFieldFormats(template);
  const keys = templateFieldKeys(template);
  const fields: DocgenField[] = keys.map((key) => {
    const labels = fieldLabels(key);
    const caseField = caseFieldsByKey.get(key);
    if (caseField && (caseField.valueText || caseField.valueJsonb !== null)) {
      return {
        key,
        ...labels,
        valueText: caseField.valueText ?? null,
        valueJsonb: caseField.valueJsonb ?? null,
        sourceKind: caseField.sourceKind,
        confidence: toConfidence(caseField.confidence),
        citingKeys: [],
        questionId: null,
        format: formatByKey.get(key) ?? "text",
      };
    }
    if (PERSON_FIELD_KEY_SET.has(key) && person) {
      const resolved = readPersonField(person, key);
      if (resolved && (resolved.valueText || resolved.valueJsonb !== null)) {
        return {
          key,
          ...labels,
          valueText: resolved.valueText,
          valueJsonb: resolved.valueJsonb,
          sourceKind: "system",
          confidence: null,
          citingKeys: [],
          questionId: null,
          format: formatByKey.get(key) ?? "text",
        };
      }
    }
    if (COMPANY_FIELD_KEY_SET.has(key) && company) {
      const resolved = readCompanyField(company, key);
      if (resolved && (resolved.valueText || resolved.valueJsonb !== null)) {
        return {
          key,
          ...labels,
          valueText: resolved.valueText,
          valueJsonb: resolved.valueJsonb,
          sourceKind: "system",
          confidence: null,
          citingKeys: [],
          questionId: null,
          format: formatByKey.get(key) ?? "text",
        };
      }
    }
    return {
      key,
      ...labels,
      valueText: null,
      valueJsonb: null,
      sourceKind: "blank",
      confidence: null,
      citingKeys: [],
      questionId: null,
      format: formatByKey.get(key) ?? "text",
    };
  });

  const repeats: DocgenRepeat[] = [];
  for (const repeatKey of templateRepeatKeys(template)) {
    const repeatBlock = template.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.type === "repeat" && block.key === repeatKey);
    if (!repeatBlock || repeatBlock.type !== "repeat") {
      continue;
    }

    const buildItemFromPerson = (item: Person): Record<string, DocgenField> => {
      const record: Record<string, DocgenField> = {};
      for (const field of repeatBlock.fields) {
        const labels = fieldLabels(field.key);
        const resolved = PERSON_FIELD_KEY_SET.has(field.key)
          ? readPersonField(item, field.key)
          : null;
        record[field.key] = {
          key: field.key,
          ...labels,
          valueText: resolved?.valueText ?? null,
          valueJsonb: resolved?.valueJsonb ?? null,
          sourceKind:
            resolved && (resolved.valueText || resolved.valueJsonb !== null) ? "system" : "blank",
          confidence: null,
          citingKeys: [],
          questionId: null,
          format: field.format ?? "text",
        };
      }
      return record;
    };

    const buildItemFromDocumentRows = (): Record<string, DocgenField> => {
      const record: Record<string, DocgenField> = {};
      for (const field of repeatBlock.fields) {
        const labels = fieldLabels(field.key);
        const row = PERSON_FIELD_KEY_SET.has(field.key)
          ? caseFieldsByKey.get(field.key)
          : undefined;
        const sourced = row && row.sourceKind === "document" ? row : null;
        record[field.key] = {
          key: field.key,
          ...labels,
          valueText: sourced?.valueText ?? null,
          valueJsonb: sourced?.valueJsonb ?? null,
          sourceKind: sourced ? "document" : "blank",
          confidence: toConfidence(sourced?.confidence),
          citingKeys: [],
          questionId: null,
          format: field.format ?? "text",
        };
      }
      return record;
    };

    let items: Array<Record<string, DocgenField>>;
    if (repeatKey === "managers") {
      if (people.length > 0) {
        items = people.map(buildItemFromPerson);
      } else {
        const hasDocumentPerson = caseFieldRows.some(
          (row) => row.sourceKind === "document" && PERSON_FIELD_KEY_SET.has(row.fieldKey),
        );
        items = hasDocumentPerson ? [buildItemFromDocumentRows()] : [];
      }
    } else {
      items = (person ? [person] : []).map(buildItemFromPerson);
    }

    repeats.push({ key: repeatKey, items });
  }

  const missingKeys = fields.filter((field) => !hasFieldValue(field)).map((field) => field.key);

  return {
    template,
    caseId: input.caseId ?? null,
    companyId,
    fields,
    repeats,
    missingKeys,
  };
}

async function collectCitations(
  ctx: Context,
  template: DocumentTemplateDef,
): Promise<{ citations: DocgenCitation[]; aliases: Record<string, string> }> {
  const aliases: Record<string, string> = {};
  const byId = new Map<string, DocgenCitation>();

  for (const key of template.citationKeys) {
    const source = CITATION_KEY_SOURCES[key] ?? key;
    const matches = await repo.searchRuleCitations(ctx.db, { terms: [source], limit: 4 });
    for (const match of matches) {
      byId.set(match.id, toCitation(match));
    }
    const first = matches[0];
    if (first) {
      aliases[key] = first.id;
    }
  }

  return { citations: [...byId.values()], aliases };
}

function buildRender(
  template: DocumentTemplateDef,
  payload: DocgenDraftPayload,
): { markdown: string; html: string } {
  const citationMap: Record<string, RenderCitation> = {};
  const byId = new Map(payload.citations.map((citation) => [citation.id, citation]));
  for (const [key, id] of Object.entries(payload.citationAliases ?? {})) {
    const citation = byId.get(id);
    if (citation) {
      citationMap[key] = citation;
    }
  }
  for (const citation of payload.citations) {
    citationMap[citation.id] = citation;
  }

  const fields: Record<string, RenderFieldValue> = {};
  for (const field of payload.fields) {
    fields[field.key] = {
      key: field.key,
      valueText: field.valueText,
      valueJsonb: field.valueJsonb,
      sourceKind: field.sourceKind,
      citingKeys: field.citingKeys,
    };
  }

  const repeats: Record<string, Array<Record<string, RenderFieldValue>>> = {};
  for (const repeat of payload.repeats) {
    repeats[repeat.key] = repeat.items.map((item) => {
      const record: Record<string, RenderFieldValue> = {};
      for (const [key, field] of Object.entries(item)) {
        record[key] = {
          key: field.key,
          valueText: field.valueText,
          valueJsonb: field.valueJsonb,
          sourceKind: field.sourceKind,
          citingKeys: field.citingKeys,
        };
      }
      return record;
    });
  }

  return renderDocument({
    template,
    language: payload.language,
    fields,
    repeats,
    additionalClauses: payload.additionalClauses,
    citations: citationMap,
    generatedAt: new Date().toISOString(),
  });
}

function questionFor(field: DocgenField, language: DocLang): DocgenQuestion {
  const label = language === "ar" ? field.labelAr : field.labelFr;
  return {
    id: crypto.randomUUID(),
    key: field.key,
    question:
      language === "ar"
        ? `يرجى تحديد قيمة الحقل: ${label}`
        : `Veuillez préciser la valeur du champ : ${label}`,
    options: [],
  };
}

function mergeAiOutput(
  base: DocumentContextView,
  ai: DocgenAiOutput,
  allowedCitationIds: Set<string>,
  language: DocLang,
): {
  fields: DocgenField[];
  questions: DocgenQuestion[];
  missingKeys: string[];
  additionalClauses: Array<{ title: string; text: string; citingKeys: string[] }>;
  delicateFlags: Array<{ summary: string; severity: string; reasons: string[] }>;
  rationale: string | null;
} {
  const fields = base.fields.map((field) => ({ ...field, citingKeys: [...field.citingKeys] }));
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));

  for (const aiField of ai.fields) {
    const existing = fieldByKey.get(aiField.key);
    if (!existing || hasFieldValue(existing)) {
      continue;
    }
    if (aiField.valueText == null && aiField.valueJsonb == null) {
      continue;
    }
    existing.valueText = aiField.valueText ?? null;
    existing.valueJsonb = aiField.valueJsonb ?? null;
    existing.sourceKind = "ai";
    existing.confidence = toConfidence(aiField.confidence);
    existing.citingKeys = (aiField.citingKeys ?? []).filter((id) => allowedCitationIds.has(id));
  }

  const questions: DocgenQuestion[] = [];
  for (const question of ai.questions ?? []) {
    const field = question.key ? fieldByKey.get(question.key) : undefined;
    if (field && hasFieldValue(field)) {
      continue;
    }
    const id = question.id || crypto.randomUUID();
    questions.push({
      id,
      key: question.key ?? null,
      question: question.question,
      options: question.options ?? [],
    });
    if (field) {
      field.questionId = id;
    }
  }

  for (const field of fields) {
    if (!hasFieldValue(field) && !field.questionId) {
      const question = questionFor(field, language);
      field.questionId = question.id;
      questions.push(question);
    }
  }

  const missingKeys = fields.filter((field) => !hasFieldValue(field)).map((field) => field.key);

  return {
    fields,
    questions,
    missingKeys,
    additionalClauses: (ai.additionalClauses ?? []).map((clause) => ({
      title: clause.title,
      text: clause.text,
      citingKeys: (clause.citingKeys ?? []).filter((id) => allowedCitationIds.has(id)),
    })),
    delicateFlags: (ai.delicateFlags ?? []).map((flag) => ({
      summary: flag.summary,
      severity: flag.severity ?? "warning",
      reasons: flag.reasons ?? [],
    })),
    rationale: ai.rationale ?? null,
  };
}

function applyAnswers(
  payload: DocgenDraftPayload,
  answers: Array<{ questionId: string; valueText?: string | null }> | undefined,
): void {
  if (!answers || answers.length === 0) {
    return;
  }
  for (const answer of answers) {
    const question = payload.questions.find((entry) => entry.id === answer.questionId);
    if (!question) {
      continue;
    }
    if (question.key) {
      const field = payload.fields.find((entry) => entry.key === question.key);
      if (field) {
        field.valueText = answer.valueText ?? null;
        field.valueJsonb = null;
        field.sourceKind = "user";
        field.confidence = null;
        field.citingKeys = [];
        field.questionId = null;
      }
    }
    payload.questions = payload.questions.filter((entry) => entry.id !== answer.questionId);
  }
  payload.missingKeys = payload.fields
    .filter((field) => !hasFieldValue(field))
    .map((field) => field.key);
}

function proposalSubject(input: { caseId?: string | null; companyId?: string | null }): {
  subjectType: AiProposal["subjectType"];
  subjectId: string;
} {
  if (input.caseId) {
    return { subjectType: "case", subjectId: input.caseId };
  }
  if (input.companyId) {
    return { subjectType: "company", subjectId: input.companyId };
  }
  throw new ORPCError("BAD_REQUEST", { message: "A caseId or companyId is required" });
}

export async function generateDraft(
  ctx: Context,
  input: {
    templateCode: string;
    language: DocLang;
    mode: DocgenMode;
    caseId?: string;
    companyId?: string;
    stepId?: string;
    answers?: Array<{ questionId: string; valueText?: string | null }>;
  },
): Promise<DocgenDraftView> {
  const user = requireUser(ctx);
  const companyId = await authorizeScopeWrite(ctx, {
    caseId: input.caseId,
    companyId: input.companyId,
  });
  const template = await loadTemplateOrThrow(input.templateCode);

  const base = await resolveDocumentContext(ctx, {
    templateCode: input.templateCode,
    caseId: input.caseId,
    companyId: companyId ?? undefined,
  });

  const { citations, aliases } = await collectCitations(ctx, template);
  const allowedCitationIds = new Set(citations.map((citation) => citation.id));

  let fields = base.fields;
  let repeats = base.repeats;
  let questions: DocgenQuestion[] = [];
  let missingKeys = base.missingKeys;
  let additionalClauses: DocgenDraftPayload["additionalClauses"] = [];
  let delicateFlags: DocgenDraftPayload["delicateFlags"] = [];
  let rationale: string | null = null;

  if (input.mode === "ai") {
    const aiOutput = await generateDocDraft({
      model: ctx.ai.model,
      language: input.language,
      template,
      fields: base.fields.map((field) => ({
        key: field.key,
        labelFr: field.labelFr,
        labelAr: field.labelAr,
        valueText: field.valueText,
        valueJsonb: field.valueJsonb,
        sourceKind: field.sourceKind,
      })),
      citations: citations.map(toCitationPayload),
    });
    const merged = mergeAiOutput(base, aiOutput, allowedCitationIds, input.language);
    fields = merged.fields;
    repeats = base.repeats;
    questions = merged.questions;
    missingKeys = merged.missingKeys;
    additionalClauses = merged.additionalClauses;
    delicateFlags = merged.delicateFlags;
    rationale = merged.rationale;
  } else {
    for (const field of fields) {
      if (!hasFieldValue(field)) {
        const question = questionFor(field, input.language);
        field.questionId = question.id;
        questions.push(question);
      }
    }
  }

  const payload: DocgenDraftPayload = {
    templateCode: template.code,
    templateVersion: template.version,
    documentTypeCode: template.documentTypeCode,
    language: input.language,
    mode: input.mode,
    caseId: input.caseId ?? null,
    companyId: companyId ?? null,
    stepId: input.stepId ?? null,
    fields,
    repeats,
    questions,
    missingKeys,
    additionalClauses,
    rationale,
    delicateFlags,
    citations,
    citationAliases: aliases,
    render: { markdown: "", html: "" },
  };

  applyAnswers(payload, input.answers);
  payload.render = buildRender(template, payload);

  const subject = proposalSubject(payload);

  const created = await repo.insertDocgenProposal(ctx.db, {
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
    kind: DOCGEN_PROPOSAL_KIND,
    status: "draft",
    payload: payload as unknown as JsonObject,
    rationale: rationale ?? null,
  });
  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create document draft" });
  }

  await repo.supersedeDocgenProposals(ctx.db, {
    kind: DOCGEN_PROPOSAL_KIND,
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
    exceptId: created.id,
  });

  const citedIds = new Set<string>();
  for (const field of fields) {
    for (const id of field.citingKeys) {
      citedIds.add(id);
    }
  }
  for (const clause of additionalClauses) {
    for (const id of clause.citingKeys) {
      citedIds.add(id);
    }
  }
  for (const id of citedIds) {
    await repo.insertGeneratedAiCitation(ctx.db, {
      proposalId: created.id,
      ruleCitationId: id,
      snippet: null,
    });
  }

  await recordActivity(ctx, {
    companyId: payload.companyId,
    actorUserId: user.id,
    actorType: input.mode === "ai" ? "ai" : "user",
    entityType: "ai_proposal",
    entityId: created.id,
    action: "docgen.draft_created",
    summary: `Document draft created (${template.code}, ${input.mode})`,
    data: { templateCode: template.code, mode: input.mode, missingKeys: missingKeys.length },
  });

  return toDraftView(created);
}

export async function updateDraft(
  ctx: Context,
  input: {
    proposalId: string;
    fields?: Array<{ key: string; valueText?: string | null; valueJsonb?: unknown }>;
    answers?: Array<{ questionId: string; valueText?: string | null }>;
  },
): Promise<DocgenDraftView> {
  requireUser(ctx);
  const proposal = await loadDraftOrThrow(ctx, input.proposalId);
  await authorizeProposalWrite(ctx, proposal);

  const payload = asPayload(proposal.payload);
  const template = await loadTemplateOrThrow(payload.templateCode);

  if (input.fields) {
    for (const edit of input.fields) {
      const field = payload.fields.find((entry) => entry.key === edit.key);
      if (!field) {
        continue;
      }
      field.valueText = edit.valueText ?? null;
      field.valueJsonb = edit.valueJsonb ?? null;
      field.sourceKind = "user";
      field.confidence = null;
      field.citingKeys = [];
      field.questionId = null;
      payload.questions = payload.questions.filter((question) => question.key !== edit.key);
    }
  }

  applyAnswers(payload, input.answers);
  payload.render = buildRender(template, payload);

  const updated = await repo.updateDocgenProposal(ctx.db, proposal.id, {
    payload: payload as unknown as JsonObject,
    rationale: payload.rationale,
  });

  return toDraftView(updated ?? proposal);
}

export async function getDraft(
  ctx: Context,
  input: { proposalId: string },
): Promise<DocgenDraftView> {
  const proposal = await loadDraftOrThrow(ctx, input.proposalId);
  await authorizeProposalRead(ctx, proposal);
  return toDraftView(proposal);
}

export async function applyAiDraftFields(
  ctx: Context,
  input: { proposalId: string; fields: AiFieldWrite[]; rationale?: string },
): Promise<DocgenDraftView> {
  const user = requireUser(ctx);
  const proposal = await loadDraftOrThrow(ctx, input.proposalId);
  await authorizeProposalWrite(ctx, proposal);

  const payload = asPayload(proposal.payload);
  const template = await loadTemplateOrThrow(payload.templateCode);

  const aliases = payload.citationAliases ?? {};
  const allowedCitationIds = new Set<string>([
    ...payload.citations.map((citation) => citation.id),
    ...Object.values(aliases),
  ]);
  const resolveCitationKeys = (citingKeys: string[] | undefined): string[] => {
    if (!citingKeys || citingKeys.length === 0) {
      return [];
    }
    const resolved = new Set<string>();
    for (const key of citingKeys) {
      const concrete = aliases[key] ?? key;
      if (allowedCitationIds.has(concrete)) {
        resolved.add(concrete);
      }
    }
    return [...resolved];
  };

  const newlyCitedIds = new Set<string>();

  for (const write of input.fields) {
    let field: DocgenField | undefined;
    if (write.repeatKey) {
      const repeat = payload.repeats.find((entry) => entry.key === write.repeatKey);
      const item = repeat?.items[write.itemIndex ?? 0];
      field = item?.[write.key];
    } else {
      field = payload.fields.find((entry) => entry.key === write.key);
    }
    if (!field) {
      continue;
    }

    const citingKeys = resolveCitationKeys(write.citingKeys);
    field.valueText = write.valueText ?? null;
    field.valueJsonb = write.valueJsonb ?? null;
    field.sourceKind = "ai";
    field.confidence = toConfidence(write.confidence);
    field.citingKeys = citingKeys;
    field.questionId = null;
    payload.questions = payload.questions.filter((question) => question.key !== write.key);
    for (const id of citingKeys) {
      newlyCitedIds.add(id);
    }
  }

  payload.missingKeys = payload.fields
    .filter((field) => !hasFieldValue(field))
    .map((field) => field.key);
  if (input.rationale) {
    payload.rationale = input.rationale;
  }
  payload.render = buildRender(template, payload);

  const updated = await repo.updateDocgenProposal(ctx.db, proposal.id, {
    payload: payload as unknown as JsonObject,
    rationale: payload.rationale,
  });

  for (const id of newlyCitedIds) {
    await repo.insertGeneratedAiCitation(ctx.db, {
      proposalId: proposal.id,
      ruleCitationId: id,
      snippet: null,
    });
  }

  await recordActivity(ctx, {
    companyId: payload.companyId,
    actorUserId: user.id,
    actorType: "ai",
    entityType: "ai_proposal",
    entityId: proposal.id,
    action: "docgen.draft_ai_filled",
    summary: `AI filled ${input.fields.length} draft field(s) (${payload.templateCode})`,
    data: {
      templateCode: payload.templateCode,
      keys: input.fields.map((field) => field.key),
      citationCount: newlyCitedIds.size,
    },
  });

  return toDraftView(updated ?? proposal);
}

export async function approveDraft(
  ctx: Context,
  input: { proposalId: string },
): Promise<DocgenDraftView & { documentId: string; versionId: string; storageKey: string }> {
  const user = requireUser(ctx);
  const proposal = await loadDraftOrThrow(ctx, input.proposalId);
  await authorizeProposalWrite(ctx, proposal);

  if (proposal.status !== "draft") {
    throw new ORPCError("BAD_REQUEST", { message: "This draft has already been resolved" });
  }

  const payload = asPayload(proposal.payload);
  const template = await loadTemplateOrThrow(payload.templateCode);
  payload.render = buildRender(template, payload);

  const companyId =
    payload.companyId ?? (proposal.subjectType === "company" ? proposal.subjectId : null);
  const caseId = payload.caseId ?? (proposal.subjectType === "case" ? proposal.subjectId : null);

  if (!companyId && !caseId) {
    throw new ORPCError("BAD_REQUEST", { message: "A caseId or companyId is required" });
  }

  const title = localized(template.title, payload.language);
  const description = localized(template.description, payload.language);
  const documentTypeId =
    (await repo.findDocumentTypeByCode(ctx.db, template.documentTypeCode))?.id ?? null;

  const document = await repo.insertGeneratedDocument(ctx.db, {
    companyId: companyId ?? null,
    caseId: caseId ?? null,
    documentTypeId,
    ownerUserId: user.id,
    title,
    description,
    status: "verified",
  });
  if (!document) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to create generated document",
    });
  }

  const html = wrapHtmlDocument(payload.render.html, { language: payload.language, title });
  const bytes = new TextEncoder().encode(html);
  const fileName = `${template.code}-v${template.version}-${payload.language}.html`;
  const storageKey = companyId
    ? `companies/${companyId}/documents/${document.id}/v1/${fileName}`
    : `cases/${caseId}/documents/${document.id}/v1/${fileName}`;
  const hash = await sha256Hex(bytes);

  await ctx.storage.put(storageKey, bytes, {
    contentType: "text/html; charset=utf-8",
    size: bytes.byteLength,
  });

  const version = await repo.insertGeneratedDocumentVersion(ctx.db, {
    documentId: document.id,
    version: 1,
    storageBucket: ctx.storage.bucket,
    storagePath: storageKey,
    fileName,
    mimeType: "text/html",
    size: bytes.byteLength,
    hash,
    source: payload.mode === "ai" ? "ai_generated" : "generated",
    uploadedByUserId: user.id,
  });
  if (!version) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create document version" });
  }

  await repo.updateGeneratedDocument(ctx.db, document.id, { currentVersionId: version.id });

  if (companyId) {
    await repo.insertGeneratedDocumentLink(ctx.db, {
      documentId: document.id,
      linkType: "company",
      linkId: companyId,
      addedBy: user.id,
    });
  }
  if (caseId) {
    await repo.insertGeneratedDocumentLink(ctx.db, {
      documentId: document.id,
      linkType: "case",
      linkId: caseId,
      addedBy: user.id,
    });
  }

  if (caseId) {
    await persistCaseFields(ctx, {
      caseId,
      stepId: payload.stepId,
      proposal,
      fields: payload.fields,
      language: payload.language,
    });
  }

  payload.approvedDocumentId = document.id;
  payload.approvedVersionId = version.id;
  payload.approvedStorageKey = storageKey;

  const updated = await repo.updateDocgenProposal(ctx.db, proposal.id, {
    status: "accepted",
    payload: payload as unknown as JsonObject,
  });

  await recordActivity(ctx, {
    companyId,
    actorUserId: user.id,
    actorType: "user",
    entityType: "document",
    entityId: document.id,
    action: "document.generated",
    summary: `Generated document ${template.code} (${payload.mode})`,
    data: { proposalId: proposal.id, storageKey, source: version.source },
  });

  if (caseId) {
    await emitCaseEvent(ctx, {
      caseId,
      companyId,
      actorUserId: user.id,
      actorType: "user",
      action: "case.document_generated",
      summary: `Generated document ${title}`,
      data: { documentId: document.id, documentVersionId: version.id, storageKey },
    });
  }

  return {
    ...toDraftView(updated ?? proposal),
    documentId: document.id,
    versionId: version.id,
    storageKey,
  };
}

async function persistCaseFields(
  ctx: Context,
  input: {
    caseId: string;
    stepId: string | null;
    proposal: AiProposal;
    fields: DocgenField[];
    language: DocLang;
  },
): Promise<void> {
  const userId = ctx.user?.id ?? null;
  const provenanceRows: NewFieldProvenance[] = [];

  for (const field of input.fields) {
    if (!COMPANY_FIELD_KEY_SET.has(field.key) && !PERSON_FIELD_KEY_SET.has(field.key)) {
      continue;
    }
    if (!hasFieldValue(field) || field.sourceKind === "blank") {
      continue;
    }
    const sourceKind = field.sourceKind;
    const aiProposalId = sourceKind === "ai" ? input.proposal.id : null;
    const row = await repo.upsertGeneratedCaseFieldValue(ctx.db, {
      caseId: input.caseId,
      stepId: input.stepId,
      fieldKey: field.key,
      valueText: field.valueText,
      valueJsonb: field.valueJsonb,
      sourceKind,
      sourceDocumentVersionId: null,
      aiProposalId,
      confidence: toNumericString(field.confidence),
      enteredByUserId: userId,
    });
    if (!row) {
      continue;
    }
    provenanceRows.push({
      subjectType: "case_field",
      subjectId: row.id,
      fieldKey: field.key,
      sourceKind,
      sourceDocumentVersionId: null,
      extractionFieldId: null,
      aiProposalId,
      confidence: toNumericString(field.confidence),
      enteredByUserId: userId,
    });
  }

  await repo.insertGeneratedProvenance(ctx.db, provenanceRows);
}

export async function rejectDraft(
  ctx: Context,
  input: { proposalId: string; reason?: string },
): Promise<DocgenDraftView> {
  requireUser(ctx);
  const proposal = await loadDraftOrThrow(ctx, input.proposalId);
  await authorizeProposalWrite(ctx, proposal);

  const updated = await repo.updateDocgenProposal(ctx.db, proposal.id, {
    status: "rejected",
    rationale: input.reason ?? proposal.rationale,
  });

  await recordActivity(ctx, {
    companyId: proposal.subjectType === "company" ? proposal.subjectId : null,
    actorUserId: ctx.user?.id ?? null,
    actorType: "user",
    entityType: "ai_proposal",
    entityId: proposal.id,
    action: "docgen.draft_rejected",
    summary: input.reason ?? "Document draft rejected",
  });

  return toDraftView(updated ?? proposal);
}

export async function listDrafts(
  ctx: Context,
  input: {
    companyId?: string;
    caseId?: string;
    proposalId?: string;
    status?: AiProposal["status"];
  },
): Promise<DocgenDraftView[]> {
  if (input.proposalId) {
    const row = await loadDraftOrThrow(ctx, input.proposalId);
    await authorizeProposalRead(ctx, row);
    return [toDraftView(row)];
  }

  await authorizeScopeRead(ctx, input);

  let subjectType: AiProposal["subjectType"] | undefined;
  let subjectId: string | undefined;
  if (input.caseId) {
    subjectType = "case";
    subjectId = input.caseId;
  } else if (input.companyId) {
    subjectType = "company";
    subjectId = input.companyId;
  }

  const rows = await repo.listDocgenProposals(ctx.db, {
    kind: DOCGEN_PROPOSAL_KIND,
    subjectType,
    subjectId,
    status: input.status,
  });

  return rows.map((row) => toDraftView(row));
}

export async function getDocumentContext(
  ctx: Context,
  input: { templateCode: string; caseId?: string; companyId?: string },
): Promise<DocumentContextView> {
  await authorizeScopeRead(ctx, input);
  return resolveDocumentContext(ctx, input);
}

export async function getDocgenPromptContext(
  ctx: Context,
  proposalId: string,
): Promise<DocgenPromptContext | null> {
  const proposal = await repo.findDocgenProposal(ctx.db, proposalId);
  if (!proposal || proposal.kind !== DOCGEN_PROPOSAL_KIND) {
    return null;
  }
  await authorizeProposalRead(ctx, proposal);

  const payload = asPayload(proposal.payload);
  return {
    proposalId: proposal.id,
    templateCode: payload.templateCode,
    documentTypeCode: payload.documentTypeCode,
    language: payload.language,
    fields: payload.fields.map((field) => ({
      key: field.key,
      labelFr: field.labelFr ?? null,
      valueText: field.valueText ?? null,
      sourceKind: field.sourceKind,
    })),
    repeats: payload.repeats.map((repeat) => ({
      key: repeat.key,
      items: repeat.items.map((item) => {
        const record: Record<
          string,
          { key: string; valueText: string | null; sourceKind: string }
        > = {};
        for (const [key, field] of Object.entries(item)) {
          record[key] = {
            key: field.key,
            valueText: field.valueText ?? null,
            sourceKind: field.sourceKind,
          };
        }
        return record;
      }),
    })),
    missingKeys: payload.missingKeys ?? [],
    citations: (payload.citations ?? []).map((citation) => ({
      id: citation.id,
      source: citation.source,
      article: citation.article,
      titleFr: citation.titleFr,
    })),
  };
}

async function loadDraftOrThrow(ctx: Context, proposalId: string): Promise<AiProposal> {
  const proposal = await repo.findDocgenProposal(ctx.db, proposalId);
  if (!proposal || proposal.kind !== DOCGEN_PROPOSAL_KIND) {
    throw new ORPCError("NOT_FOUND", { message: "Document draft not found" });
  }
  return proposal;
}

async function authorizeProposalWrite(ctx: Context, proposal: AiProposal): Promise<void> {
  if (proposal.subjectType === "company") {
    await assertCompanyPermission(ctx, proposal.subjectId, "documents.write");
    return;
  }
  if (proposal.subjectType === "case") {
    await requireCasePermission(ctx, proposal.subjectId, "documents.write");
    return;
  }
  throw new ORPCError("BAD_REQUEST", {
    message: `Unsupported draft subject type: ${proposal.subjectType}`,
  });
}

async function authorizeProposalRead(ctx: Context, proposal: AiProposal): Promise<void> {
  if (proposal.subjectType === "company") {
    await assertCompanyPermission(ctx, proposal.subjectId, "documents.read");
    return;
  }
  if (proposal.subjectType === "case") {
    await requireCasePermission(ctx, proposal.subjectId, "documents.read");
    return;
  }
  throw new ORPCError("BAD_REQUEST", {
    message: `Unsupported draft subject type: ${proposal.subjectType}`,
  });
}

function toDraftView(proposal: AiProposal): DocgenDraftView {
  return {
    proposal: {
      id: proposal.id,
      subjectType: proposal.subjectType,
      subjectId: proposal.subjectId,
      kind: proposal.kind,
      status: proposal.status,
      rationale: proposal.rationale,
      createdAt: proposal.createdAt,
    },
    payload: asPayload(proposal.payload),
  };
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

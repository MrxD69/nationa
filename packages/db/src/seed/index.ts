import "varlock/auto-load";

import { sql } from "drizzle-orm";

import {
  agencies,
  createDb,
  documentTypes,
  fees,
  obligationCitations,
  obligations,
  procedureStepCitations,
  procedureSteps,
  procedureTemplates,
  ruleCitations,
} from "../index";
import { AGENCIES } from "./data/agencies";
import { DOCUMENT_TYPES } from "./data/document-types";
import { FEES } from "./data/fees";
import {
  GENERATED_DOCUMENT_TYPES,
  GENERATED_FEES,
  GENERATED_OBLIGATIONS,
  GENERATED_PROCEDURE_TEMPLATES,
  GENERATED_RULE_CITATIONS,
} from "./data/generated/procedures.generated";
import { OBLIGATIONS } from "./data/obligations";
import { PROCEDURE_TEMPLATES } from "./data/procedure-templates";
import { RULE_CITATIONS } from "./data/rule-citations";
import { seedId } from "./ids";

const db = createDb({ DATABASE_URL: process.env.DATABASE_URL || "" });

// Merge hand-written and generated seed data, deduplicating on each table's
// natural key. `preferExtra` decides which side wins on collision.
function mergeBy<T>(base: T[], extra: T[], keyOf: (item: T) => string, preferExtra = true): T[] {
  const merged = new Map<string, T>();
  for (const item of base) merged.set(keyOf(item), item);
  for (const item of extra) {
    const key = keyOf(item);
    if (preferExtra || !merged.has(key)) merged.set(key, item);
  }
  return [...merged.values()];
}

const ALL_DOCUMENT_TYPES = mergeBy(
  DOCUMENT_TYPES,
  GENERATED_DOCUMENT_TYPES,
  (documentType) => `${documentType.agencyId ?? ""}::${documentType.code}`,
  false,
);
const ALL_RULE_CITATIONS = mergeBy(
  RULE_CITATIONS,
  GENERATED_RULE_CITATIONS,
  (citation) => citation.key,
);
const ALL_OBLIGATIONS = mergeBy(
  OBLIGATIONS,
  GENERATED_OBLIGATIONS,
  (obligation) => `${obligation.agencyId}::${obligation.code}`,
);
const ALL_PROCEDURE_TEMPLATES = mergeBy(
  PROCEDURE_TEMPLATES,
  GENERATED_PROCEDURE_TEMPLATES,
  (template) => `${template.agencyId}::${template.code}`,
);
const ALL_FEES = mergeBy(FEES, GENERATED_FEES, (fee) => fee.key);

async function seed() {
  await db
    .insert(agencies)
    .values(AGENCIES)
    .onConflictDoUpdate({
      target: agencies.id,
      set: {
        nameFr: sql`excluded.name_fr`,
        nameAr: sql`excluded.name_ar`,
        nameEn: sql`excluded.name_en`,
        description: sql`excluded.description`,
        website: sql`excluded.website`,
        active: sql`excluded.active`,
        updatedAt: new Date(),
      },
    });

  const documentTypeRows = ALL_DOCUMENT_TYPES.map((documentType) => ({
    id: seedId(documentType.key),
    agencyId: documentType.agencyId,
    code: documentType.code,
    nameFr: documentType.nameFr,
    nameAr: documentType.nameAr,
    description: documentType.description,
    acceptedMimeTypes: documentType.acceptedMimeTypes,
    requiredFields: documentType.requiredFields,
    validityDays: documentType.validityDays,
    active: true,
  }));

  await db
    .insert(documentTypes)
    .values(documentTypeRows)
    .onConflictDoUpdate({
      target: documentTypes.id,
      set: {
        agencyId: sql`excluded.agency_id`,
        code: sql`excluded.code`,
        nameFr: sql`excluded.name_fr`,
        nameAr: sql`excluded.name_ar`,
        description: sql`excluded.description`,
        acceptedMimeTypes: sql`excluded.accepted_mime_types`,
        requiredFields: sql`excluded.required_fields`,
        validityDays: sql`excluded.validity_days`,
        active: sql`excluded.active`,
        updatedAt: new Date(),
      },
    });

  const ruleCitationRows = ALL_RULE_CITATIONS.map((citation) => ({
    id: seedId(citation.key),
    source: citation.source,
    article: citation.article,
    titleFr: citation.titleFr,
    titleAr: citation.titleAr,
    textFr: citation.textFr,
    textAr: citation.textAr,
    url: citation.url,
    effectiveFrom: citation.effectiveFrom,
    effectiveTo: citation.effectiveTo,
  }));

  await db
    .insert(ruleCitations)
    .values(ruleCitationRows)
    .onConflictDoUpdate({
      target: ruleCitations.id,
      set: {
        source: sql`excluded.source`,
        article: sql`excluded.article`,
        titleFr: sql`excluded.title_fr`,
        titleAr: sql`excluded.title_ar`,
        textFr: sql`excluded.text_fr`,
        textAr: sql`excluded.text_ar`,
        url: sql`excluded.url`,
        effectiveFrom: sql`excluded.effective_from`,
        effectiveTo: sql`excluded.effective_to`,
      },
    });

  const obligationRows = ALL_OBLIGATIONS.map((obligation) => ({
    id: seedId(obligation.key),
    agencyId: obligation.agencyId,
    code: obligation.code,
    nameFr: obligation.nameFr,
    nameAr: obligation.nameAr,
    description: obligation.description,
    legalBasis: obligation.legalBasis,
    periodicity: obligation.periodicity,
    deadlineRule: obligation.deadlineRule,
    penaltySummary: obligation.penaltySummary,
    appliesTo: obligation.appliesTo,
    active: true,
  }));

  await db
    .insert(obligations)
    .values(obligationRows)
    .onConflictDoUpdate({
      target: [obligations.agencyId, obligations.code],
      set: {
        nameFr: sql`excluded.name_fr`,
        nameAr: sql`excluded.name_ar`,
        description: sql`excluded.description`,
        legalBasis: sql`excluded.legal_basis`,
        periodicity: sql`excluded.periodicity`,
        deadlineRule: sql`excluded.deadline_rule`,
        penaltySummary: sql`excluded.penalty_summary`,
        appliesTo: sql`excluded.applies_to`,
        active: sql`excluded.active`,
        updatedAt: new Date(),
      },
    });

  const templateRows = ALL_PROCEDURE_TEMPLATES.map((template) => ({
    id: seedId(template.key),
    agencyId: template.agencyId,
    obligationId: template.obligationKey ? seedId(template.obligationKey) : null,
    code: template.code,
    nameFr: template.nameFr,
    nameAr: template.nameAr,
    description: template.description,
    category: template.category,
    estimatedDays: template.estimatedDays,
    active: true,
  }));

  await db
    .insert(procedureTemplates)
    .values(templateRows)
    .onConflictDoUpdate({
      target: [procedureTemplates.agencyId, procedureTemplates.code],
      set: {
        obligationId: sql`excluded.obligation_id`,
        nameFr: sql`excluded.name_fr`,
        nameAr: sql`excluded.name_ar`,
        description: sql`excluded.description`,
        category: sql`excluded.category`,
        estimatedDays: sql`excluded.estimated_days`,
        active: sql`excluded.active`,
        updatedAt: new Date(),
      },
    });

  const stepRows = ALL_PROCEDURE_TEMPLATES.flatMap((template) =>
    template.steps.map((step) => ({
      id: seedId(step.key),
      templateId: seedId(template.key),
      position: step.position,
      code: step.code,
      titleFr: step.titleFr,
      titleAr: step.titleAr,
      description: step.description,
      stepType: step.stepType,
      requiredDocumentTypeId: step.requiredDocumentTypeKey
        ? seedId(step.requiredDocumentTypeKey)
        : null,
      formSchema: step.formSchema,
      isOptional: step.isOptional,
    })),
  );

  await db
    .insert(procedureSteps)
    .values(stepRows)
    .onConflictDoUpdate({
      target: [procedureSteps.templateId, procedureSteps.position],
      set: {
        code: sql`excluded.code`,
        titleFr: sql`excluded.title_fr`,
        titleAr: sql`excluded.title_ar`,
        description: sql`excluded.description`,
        stepType: sql`excluded.step_type`,
        requiredDocumentTypeId: sql`excluded.required_document_type_id`,
        formSchema: sql`excluded.form_schema`,
        isOptional: sql`excluded.is_optional`,
        updatedAt: new Date(),
      },
    });

  const feeRows = ALL_FEES.map((fee) => ({
    id: seedId(fee.key),
    agencyId: fee.agencyId,
    procedureTemplateId: fee.procedureTemplateKey ? seedId(fee.procedureTemplateKey) : null,
    obligationId: fee.obligationKey ? seedId(fee.obligationKey) : null,
    label: fee.label,
    amount: fee.amount,
    currency: fee.currency,
    logic: fee.logic,
    active: true,
  }));

  await db
    .insert(fees)
    .values(feeRows)
    .onConflictDoUpdate({
      target: fees.id,
      set: {
        agencyId: sql`excluded.agency_id`,
        procedureTemplateId: sql`excluded.procedure_template_id`,
        obligationId: sql`excluded.obligation_id`,
        label: sql`excluded.label`,
        amount: sql`excluded.amount`,
        currency: sql`excluded.currency`,
        logic: sql`excluded.logic`,
        active: sql`excluded.active`,
        updatedAt: new Date(),
      },
    });

  const obligationCitationRows = ALL_OBLIGATIONS.flatMap((obligation) =>
    obligation.citationKeys.map((citationKey) => ({
      obligationId: seedId(obligation.key),
      ruleCitationId: seedId(citationKey),
    })),
  );

  if (obligationCitationRows.length > 0) {
    await db.insert(obligationCitations).values(obligationCitationRows).onConflictDoNothing();
  }

  const procedureStepCitationRows = ALL_PROCEDURE_TEMPLATES.flatMap((template) =>
    template.steps.flatMap((step) =>
      step.citationKeys.map((citationKey) => ({
        stepId: seedId(step.key),
        ruleCitationId: seedId(citationKey),
      })),
    ),
  );

  if (procedureStepCitationRows.length > 0) {
    await db.insert(procedureStepCitations).values(procedureStepCitationRows).onConflictDoNothing();
  }

  return {
    agencies: AGENCIES.length,
    documentTypes: documentTypeRows.length,
    ruleCitations: ruleCitationRows.length,
    obligations: obligationRows.length,
    procedureTemplates: templateRows.length,
    procedureSteps: stepRows.length,
    fees: feeRows.length,
    obligationCitations: obligationCitationRows.length,
    procedureStepCitations: procedureStepCitationRows.length,
  };
}

const counts = await seed();

console.log("[seed] nationa database seeded:", counts);

process.exit(0);

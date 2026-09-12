import { beneficialOwnerDeclarationMissing } from "./rules/beneficial-owner";
import {
  capitalMismatch,
  companyNameMismatch,
  legalFormMismatch,
} from "./rules/company-consistency";
import { documentExpired } from "./rules/document-validity";
import { obligationDeadlineNotMet } from "./rules/obligation-deadlines";
import { personNationalIdMismatch } from "./rules/person-identity";
import { requiredDocumentMissing } from "./rules/required-documents";
import type { FindingDraft, RuleContext, RuleDefinition } from "./types";

export const RULES: RuleDefinition[] = [
  requiredDocumentMissing,
  documentExpired,
  companyNameMismatch,
  capitalMismatch,
  legalFormMismatch,
  personNationalIdMismatch,
  beneficialOwnerDeclarationMissing,
  obligationDeadlineNotMet,
];

export function evaluateRules(ctx: RuleContext): FindingDraft[] {
  return RULES.filter((rule) => rule.appliesTo.includes(ctx.subject.type)).flatMap((rule) =>
    rule.evaluate(ctx),
  );
}

type FindingText = {
  title: string;
  message: string;
  fix: string;
};

const FR_FINDING_TEXT: Record<string, FindingText> = {
  required_document_missing: {
    title: "Pièce requise manquante : {documentType}",
    message:
      "La pièce « {documentType} » est exigée par la procédure, mais aucun document correspondant n'a été déposé.",
    fix: "Téléversez la pièce « {documentType} » dans le dossier avant de le soumettre.",
  },
  document_expired: {
    title: "Document expiré : {documentType}",
    message:
      "Le document « {documentType} » a expiré le {expiredOn} (validité de {validityDays} jours).",
    fix: "Téléversez une version récente et valide du document « {documentType} ».",
  },
  company_name_mismatch: {
    title: "Divergence de dénomination sociale",
    message:
      "La dénomination sociale enregistrée (« {expected} ») diffère de la valeur extraite (« {actual} »).",
    fix: "Vérifiez la dénomination sociale et mettez à jour la fiche entreprise ou corrigez l'extraction.",
  },
  person_national_id_mismatch: {
    title: "Divergence du numéro d'identité",
    message:
      "Le numéro d'identité enregistré (« {expected} ») diffère de la valeur extraite (« {actual} »).",
    fix: "Vérifiez le numéro de la carte d'identité et corrigez la fiche personne ou l'extraction.",
  },
  capital_mismatch: {
    title: "Divergence du capital social",
    message: "Le capital enregistré (« {expected} ») diffère de la valeur extraite (« {actual} »).",
    fix: "Vérifiez le montant du capital et mettez à jour la fiche entreprise ou corrigez l'extraction.",
  },
  legal_form_mismatch: {
    title: "Divergence de forme juridique",
    message:
      "La forme juridique enregistrée (« {expected} ») diffère de la valeur extraite (« {actual} »).",
    fix: "Vérifiez la forme juridique et mettez à jour la fiche entreprise ou corrigez l'extraction.",
  },
  beneficial_owner_declaration_missing: {
    title: "Déclaration des bénéficiaires effectifs manquante",
    message:
      "La société « {companyName} » compte {ownerCount} bénéficiaire(s) effectif(s) mais aucune déclaration n'a été enregistrée.",
    fix: "Déposez la déclaration des bénéficiaires effectifs et renseignez sa date.",
  },
  obligation_deadline_not_met: {
    title: "Échéance non respectée : {obligation}",
    message:
      "L'obligation « {obligation} » ({agency}) était due le {dueDate} et aucune déclaration complétée n'a été trouvée.",
    fix: "Préparez et soumettez la déclaration correspondante auprès de {agency}.",
  },
};

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => params[key] ?? `{${key}}`);
}

export function renderFindingText(
  code: string,
  params: Record<string, string>,
): { title: string; messagePlain: string; suggestedFix: string | null } {
  const template = FR_FINDING_TEXT[code] ?? {
    title: code,
    message: code,
    fix: "",
  };
  const fix = interpolate(template.fix, params);
  return {
    title: interpolate(template.title, params),
    messagePlain: interpolate(template.message, params),
    suggestedFix: fix.length > 0 ? fix : null,
  };
}

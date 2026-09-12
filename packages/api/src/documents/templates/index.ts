import { declarationExistenceDgiTemplate } from "./declaration-existence-dgi";
import { pvNominationGerantTemplate } from "./pv-nomination-gerant";
import { statutsSarlTemplate } from "./statuts-sarl";
import type { DocumentTemplateDef } from "./types";

export * from "./types";
export * from "./render";

export const DOCUMENT_TEMPLATES: readonly DocumentTemplateDef[] = [
  statutsSarlTemplate,
  pvNominationGerantTemplate,
  declarationExistenceDgiTemplate,
];

const TEMPLATES_BY_CODE: ReadonlyMap<string, DocumentTemplateDef> = new Map(
  DOCUMENT_TEMPLATES.map((template) => [template.code, template]),
);

export function listDocumentTemplates(): readonly DocumentTemplateDef[] {
  return DOCUMENT_TEMPLATES;
}

export function getDocumentTemplate(code: string): DocumentTemplateDef | null {
  return TEMPLATES_BY_CODE.get(code) ?? null;
}

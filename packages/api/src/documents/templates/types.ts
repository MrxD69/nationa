export type DocLang = "fr" | "ar";

export type LocalizedText = {
  fr: string;
  ar: string;
};

export type FieldBlock = {
  type: "field";
  id: string;
  /** Canonical field key (see domain/fields) or a template-local collection key. */
  key: string;
  label: LocalizedText;
  required?: boolean;
  format?: "text" | "longtext" | "date" | "number" | "currency" | "address";
};

export type ParagraphBlock = {
  type: "paragraph";
  id: string;
  text: LocalizedText;
};

export type ClauseBlock = {
  type: "clause";
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  /**
   * Logical citation keys used to hint at the governing rule. In AI mode these
   * are matched against the `rule_citations` catalog; the model may only cite
   * the concrete rule citation ids it is given.
   */
  citationKeys?: string[];
  optional?: boolean;
};

export type RepeatBlock = {
  type: "repeat";
  id: string;
  /** Collection key, e.g. "managers". */
  key: string;
  title: LocalizedText;
  itemLabel: LocalizedText;
  fields: FieldBlock[];
};

export type SignatureBlock = {
  type: "signature";
  id: string;
  label: LocalizedText;
  role?: LocalizedText;
};

export type TemplateBlock =
  | FieldBlock
  | ParagraphBlock
  | ClauseBlock
  | RepeatBlock
  | SignatureBlock;

export type DocumentTemplateSection = {
  id: string;
  title: LocalizedText;
  blocks: TemplateBlock[];
};

export type DocumentTemplateDef = {
  /** Stable registry code, e.g. "statuts_sarl". */
  code: string;
  version: number;
  /** `document_types.code` this template produces. */
  documentTypeCode: string;
  title: LocalizedText;
  description: LocalizedText;
  defaultLanguage: DocLang;
  sections: DocumentTemplateSection[];
  /** Canonical field keys referenced by this template. */
  canonicalKeys: string[];
  /** Logical citation keys referenced by this template's clauses. */
  citationKeys: string[];
};

export function templateFieldKeys(template: DocumentTemplateDef): string[] {
  const keys = new Set<string>();
  for (const section of template.sections) {
    for (const block of section.blocks) {
      if (block.type === "field") {
        keys.add(block.key);
      }
      if (block.type === "repeat") {
        for (const field of block.fields) {
          keys.add(field.key);
        }
      }
    }
  }
  return [...keys];
}

export function templateRepeatKeys(template: DocumentTemplateDef): string[] {
  const keys: string[] = [];
  for (const section of template.sections) {
    for (const block of section.blocks) {
      if (block.type === "repeat") {
        keys.push(block.key);
      }
    }
  }
  return keys;
}

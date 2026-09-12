import type { RuleCitation } from "@nationa/db";

import type { ParsedFormSchema } from "./procedure-forms";

export type ProcedureListItem = {
  id: string;
  agencyId: string;
  agencyNameFr: string | null;
  agencyNameAr: string | null;
  code: string;
  nameFr: string;
  nameAr: string | null;
  description: string | null;
  category: string | null;
  estimatedDays: number | null;
  stepCount: number;
};

export type ProcedureStepDetail = {
  id: string;
  templateId: string;
  position: number;
  code: string;
  titleFr: string;
  titleAr: string | null;
  description: string | null;
  stepType: string;
  requiredDocumentTypeId: string | null;
  isOptional: boolean;
  formSchema: ParsedFormSchema;
  citations: RuleCitation[];
  requiredDocumentType: {
    id: string;
    code: string;
    nameFr: string;
    nameAr: string | null;
    description: string | null;
    acceptedMimeTypes: string[];
  } | null;
};

import { FIELD_LABELS, normalizeFieldKey, type CanonicalFieldKey } from "./fields";

export const FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "currency",
  "date",
  "select",
  "checkbox",
  "radio",
  "address",
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export type FormFieldOption = {
  value: string;
  label?: { fr?: string; ar?: string };
};

export type FormFieldLabel = {
  fr?: string;
  ar?: string;
};

export type ParsedFormField = {
  key: CanonicalFieldKey;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  label?: FormFieldLabel;
};

export type ParsedFormSchema = {
  version: 1;
  fields: ParsedFormField[];
};

const FIELD_TYPE_SET = new Set<string>(FORM_FIELD_TYPES);

const DATE_FIELD_KEYS = new Set<CanonicalFieldKey>([
  "publicationDate",
  "activityStartDate",
  "mentionDate",
  "birthDate",
]);

const ADDRESS_FIELD_KEYS = new Set<CanonicalFieldKey>([
  "headquartersAddress",
  "activityAddress",
  "address",
]);

const NUMBER_FIELD_KEYS = new Set<CanonicalFieldKey>([
  "durationYears",
  "secondaryEstablishmentsCount",
]);

const CURRENCY_FIELD_KEYS = new Set<CanonicalFieldKey>(["capitalAmount"]);

const BOOLEAN_FIELD_KEYS = new Set<CanonicalFieldKey>(["leasing", "hasPledge"]);

const LEGACY_TYPE_HINTS: Array<{ keys: Set<CanonicalFieldKey>; type: FormFieldType }> = [
  { keys: ADDRESS_FIELD_KEYS, type: "address" },
  { keys: CURRENCY_FIELD_KEYS, type: "currency" },
  { keys: DATE_FIELD_KEYS, type: "date" },
  { keys: NUMBER_FIELD_KEYS, type: "number" },
  { keys: BOOLEAN_FIELD_KEYS, type: "checkbox" },
];

export function inferFieldType(key: CanonicalFieldKey): FormFieldType {
  for (const hint of LEGACY_TYPE_HINTS) {
    if (hint.keys.has(key)) {
      return hint.type;
    }
  }
  return "text";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRequiredKeys(raw: unknown): Set<string> {
  const required = new Set<string>();
  if (!Array.isArray(raw)) {
    return required;
  }
  for (const entry of raw) {
    if (typeof entry === "string") {
      const normalized = normalizeFieldKey(entry);
      if (normalized) {
        required.add(normalized);
      }
    }
  }
  return required;
}

function readLabel(raw: unknown): FormFieldLabel | undefined {
  if (typeof raw === "string" && raw.length > 0) {
    return { fr: raw };
  }
  if (!isRecord(raw)) {
    return undefined;
  }
  const fr = typeof raw.fr === "string" ? raw.fr : undefined;
  const ar = typeof raw.ar === "string" ? raw.ar : undefined;
  if (!fr && !ar) {
    return undefined;
  }
  return { ...(fr ? { fr } : {}), ...(ar ? { ar } : {}) };
}

function readOptions(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const options = raw.filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
  return options.length > 0 ? options : undefined;
}

function coerceFieldType(raw: unknown): FormFieldType | null {
  return typeof raw === "string" && FIELD_TYPE_SET.has(raw) ? (raw as FormFieldType) : null;
}

/**
 * Normalizes a stored `procedure_steps.form_schema` into the frozen v1 shape.
 *
 * Accepts both the legacy seed shape (`{ fields: string[], required: string[] }`)
 * and the explicit shape (`{ version: 1, fields: [{ key, type, ... }] }`).
 * Unknown field types and non-canonical keys are dropped defensively and the
 * function never throws.
 */
export function parseFormSchema(raw: unknown): ParsedFormSchema {
  try {
    if (!isRecord(raw)) {
      return { version: 1, fields: [] };
    }

    const rawFields = Array.isArray(raw.fields) ? raw.fields : [];
    const requiredKeys = toRequiredKeys(raw.required);
    const seen = new Set<CanonicalFieldKey>();
    const fields: ParsedFormField[] = [];

    for (const entry of rawFields) {
      let rawKey: string | null = null;
      let explicitType: FormFieldType | null = null;
      let hasExplicitType = false;
      let required = false;
      let options: string[] | undefined;
      let label: FormFieldLabel | undefined;

      if (typeof entry === "string") {
        rawKey = entry;
        required = requiredKeys.has(normalizeFieldKey(entry) ?? "");
      } else if (isRecord(entry)) {
        if (typeof entry.key === "string") {
          rawKey = entry.key;
        }
        hasExplicitType = "type" in entry;
        explicitType = coerceFieldType(entry.type);
        const normalized = rawKey ? normalizeFieldKey(rawKey) : null;
        required = entry.required === true || (normalized ? requiredKeys.has(normalized) : false);
        options = readOptions(entry.options);
        label = readLabel(entry.label);
      }

      if (!rawKey) {
        continue;
      }

      const key = normalizeFieldKey(rawKey);
      if (!key) {
        continue;
      }

      // An explicitly provided but unrecognized type means the field is unsafe
      // to render, so drop it. A missing type is inferred from the canonical key.
      if (hasExplicitType && !explicitType) {
        continue;
      }
      const type = explicitType ?? inferFieldType(key);

      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      fields.push({
        key,
        type,
        required,
        ...(options ? { options } : {}),
        ...(label ? { label } : {}),
      });
    }

    return { version: 1, fields };
  } catch {
    return { version: 1, fields: [] };
  }
}

export function labelForField(
  key: CanonicalFieldKey,
  locale: string,
  override?: FormFieldLabel,
): string {
  const overrideLabel = locale === "ar" ? override?.ar : override?.fr;
  if (overrideLabel) {
    return overrideLabel;
  }
  const fallback = FIELD_LABELS[key];
  if (locale === "ar") {
    return fallback.ar ?? fallback.fr;
  }
  return fallback.fr;
}

export function requiredFieldKeys(schema: ParsedFormSchema): CanonicalFieldKey[] {
  return schema.fields.filter((field) => field.required).map((field) => field.key);
}

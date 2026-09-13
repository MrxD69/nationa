export const DEFAULT_COMPANY_DEMARCHE = "modifier_informations_entreprise";

/** Per-field overrides; anything not listed uses the default RNE modification démarche. */
export const COMPANY_FIELD_DEMARCHE: Record<string, string> = {
  // Specialize later, e.g. mainActivityCode: "declaration_activite_soumise_autorisation",
};

export function demarcheCodeForField(fieldKey: string): string {
  return COMPANY_FIELD_DEMARCHE[fieldKey] ?? DEFAULT_COMPANY_DEMARCHE;
}

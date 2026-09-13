/**
 * Curated set of critical company documents surfaced on the "Mes infos" tab.
 *
 * `code` values must match the seeded `document_types.code` rows. Labels are
 * resolved through i18n (`documents.critical.items.*`) so the copy stays human
 * and translatable.
 */
export const CRITICAL_DOCUMENTS = [
  {
    code: "rne_extrait",
    icon: "i-tabler-building-bank",
    labelKey: "documents.critical.items.rne_extrait",
  },
  { code: "cin", icon: "i-tabler-id-badge-2", labelKey: "documents.critical.items.cin" },
  { code: "statuts", icon: "i-tabler-file-text", labelKey: "documents.critical.items.statuts" },
  {
    code: "carte_identification_fiscale",
    icon: "i-tabler-receipt",
    labelKey: "documents.critical.items.carte_identification_fiscale",
  },
  {
    code: "declaration_beneficiaire",
    icon: "i-tabler-users-group",
    labelKey: "documents.critical.items.declaration_beneficiaire",
  },
  {
    code: "pv_nomination_gerant",
    icon: "i-tabler-user-check",
    labelKey: "documents.critical.items.pv_nomination_gerant",
  },
] as const;

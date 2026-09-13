/**
 * Catalogue of the official Tunisian forms we ship a copy of.
 *
 * The point is recognition, not download: a first-page thumbnail shown beside a
 * step lets someone who has never filed before see what the paper actually looks
 * like before they go hunting for it.
 */
export interface OfficialForm {
  id: string;
  /** Served from `public/forms`. */
  pdf: string;
  /** First-page render, served from `public/forms/thumbs`. */
  thumb: string;
  nameFr: string;
  nameAr: string;
  agencyId: string | null;
  /** Seeded `document_types.code` values this form satisfies. */
  documentTypeCodes: string[];
  /** Accent-insensitive, lowercase fragments matched against step text. */
  keywords: string[];
}

export const OFFICIAL_FORMS: OfficialForm[] = [
  {
    id: "statuts-societe-sarl",
    pdf: "/forms/statuts-societe-sarl.pdf",
    thumb: "/forms/thumbs/statuts-societe-sarl.webp",
    nameFr: "Statuts d'une SARL (modèle)",
    nameAr: "النظام الأساسي لشركة ذات مسؤولية محدودة (نموذج)",
    agencyId: "RNE",
    documentTypeCodes: ["statuts"],
    keywords: ["statut", "sarl", "responsabilite limitee", "acte constitutif"],
  },
  {
    id: "declaration-beneficiaire-effectif",
    pdf: "/forms/declaration-beneficiaire-effectif.pdf",
    thumb: "/forms/thumbs/declaration-beneficiaire-effectif.webp",
    nameFr: "Déclaration du bénéficiaire effectif",
    nameAr: "التصريح بالمستفيد الفعلي",
    agencyId: "RNE",
    documentTypeCodes: ["declaration_beneficiaire"],
    keywords: ["beneficiaire effectif", "beneficiaire"],
  },
  {
    id: "demande-immatriculation-personne-physique",
    pdf: "/forms/demande-immatriculation-personne-physique.pdf",
    thumb: "/forms/thumbs/demande-immatriculation-personne-physique.webp",
    nameFr: "Demande d'immatriculation — personne physique",
    nameAr: "مطلب تسجيل شخص طبيعي",
    agencyId: "RNE",
    documentTypeCodes: [],
    keywords: ["personne physique", "immatriculation", "inscription au registre"],
  },
  {
    id: "demande-immatriculation-societe-anonyme",
    pdf: "/forms/demande-immatriculation-societe-anonyme.pdf",
    thumb: "/forms/thumbs/demande-immatriculation-societe-anonyme.webp",
    nameFr: "Demande d'immatriculation — société anonyme",
    nameAr: "مطلب تسجيل شركة خفية الاسم",
    agencyId: "RNE",
    documentTypeCodes: [],
    keywords: ["societe anonyme", "personne morale", "immatriculation", "inscription au registre"],
  },
  {
    id: "declaration-existence-contribuable",
    pdf: "/forms/declaration-existence-contribuable.pdf",
    thumb: "/forms/thumbs/declaration-existence-contribuable.webp",
    nameFr: "Déclaration d'existence (contribuable)",
    nameAr: "التصريح بالوجود",
    agencyId: "DGI",
    documentTypeCodes: [],
    keywords: [
      "declaration d'existence",
      "declaration existence",
      "contribuable",
      "matricule fiscal",
      "identifiant fiscal",
      "carte d'identification fiscale",
    ],
  },
  {
    id: "liasse-unique-declaration-investissement",
    pdf: "/forms/liasse-unique-declaration-investissement.pdf",
    thumb: "/forms/thumbs/liasse-unique-declaration-investissement.webp",
    nameFr: "Liasse unique — déclaration d'investissement",
    nameAr: "الملف الموحد — التصريح بالاستثمار",
    agencyId: "APII",
    documentTypeCodes: [],
    keywords: [
      "liasse unique",
      "declaration d'investissement",
      "declaration investissement",
      "attestation de declaration",
      "projet d'investissement",
      "dossier apii",
    ],
  },
];

/** Lowercase and strip diacritics so "déclaration" matches "declaration". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export interface FormMatchInput {
  title?: string | null;
  description?: string | null;
  documentTypeCode?: string | null;
  agencyId?: string | null;
}

/**
 * Returns the forms worth showing beside a step, most relevant first.
 *
 * A document-type code is an exact contract and always wins. Otherwise we score
 * on how many keywords appear in the step's own wording, and an agency match
 * breaks ties so an RNE step does not surface a DGI form.
 */
export function matchForms(input: FormMatchInput, limit = 2): OfficialForm[] {
  const haystack = normalize(`${input.title ?? ""} ${input.description ?? ""}`);
  const code = input.documentTypeCode ?? null;

  const scored = OFFICIAL_FORMS.map((form) => {
    if (code && form.documentTypeCodes.includes(code)) {
      return { form, score: 1000 };
    }

    let score = 0;
    for (const keyword of form.keywords) {
      if (haystack.includes(normalize(keyword))) {
        score += keyword.includes(" ") ? 2 : 1;
      }
    }
    if (score > 0 && input.agencyId && form.agencyId === input.agencyId) {
      score += 1;
    }
    return { form, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.form);
}

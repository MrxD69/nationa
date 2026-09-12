export const COMPANY_FIELD_KEYS = [
  "legalName",
  "legalNameAr",
  "tradeName",
  "brandName",
  "legalForm",
  "capitalAmount",
  "currency",
  "durationYears",
  "publicationDate",
  "headquartersAddress",
  "activityAddress",
  "mainActivityLabel",
  "mainActivityLabelAr",
  "mainActivityCode",
  "activityStartDate",
  "registryState",
  "secondaryEstablishmentsCount",
  "leasing",
  "hasPledge",
  "fiscalDefault",
  "mentionDate",
  "uniqueIdentifier",
  "internalManagementNumber",
  "registryType",
  "taxId",
] as const;

export const PERSON_FIELD_KEYS = [
  "fullName",
  "fullNameAr",
  "firstName",
  "lastName",
  "nationalId",
  "nationality",
  "birthDate",
  "gender",
  "email",
  "phone",
  "address",
] as const;

export type CompanyFieldKey = (typeof COMPANY_FIELD_KEYS)[number];
export type PersonFieldKey = (typeof PERSON_FIELD_KEYS)[number];
export type CanonicalFieldKey = CompanyFieldKey | PersonFieldKey;

export type FieldLabel = {
  fr: string;
  ar?: string;
};

export const FIELD_LABELS: Record<CanonicalFieldKey, FieldLabel> = {
  legalName: { fr: "Dénomination sociale", ar: "الاسم القانوني" },
  legalNameAr: { fr: "Dénomination sociale (arabe)", ar: "الاسم القانوني بالعربية" },
  tradeName: { fr: "Nom commercial", ar: "الاسم التجاري" },
  brandName: { fr: "Enseigne", ar: "العلامة التجارية" },
  legalForm: { fr: "Forme juridique", ar: "الشكل القانوني" },
  capitalAmount: { fr: "Capital", ar: "رأس المال" },
  currency: { fr: "Devise", ar: "العملة" },
  durationYears: { fr: "Durée", ar: "المدة" },
  publicationDate: { fr: "Date de publication", ar: "تاريخ النشر" },
  headquartersAddress: { fr: "Siège social", ar: "المقر الاجتماعي" },
  activityAddress: { fr: "Adresse d'activité", ar: "عنوان النشاط" },
  mainActivityLabel: { fr: "Activité principale", ar: "النشاط الرئيسي" },
  mainActivityLabelAr: { fr: "Activité principale (arabe)", ar: "النشاط الرئيسي بالعربية" },
  mainActivityCode: { fr: "Code activité", ar: "رمز النشاط" },
  activityStartDate: { fr: "Date début d'activité", ar: "تاريخ بداية النشاط" },
  registryState: { fr: "État au registre", ar: "الحالة في السجل" },
  secondaryEstablishmentsCount: {
    fr: "Établissements secondaires",
    ar: "المؤسسات الثانوية",
  },
  leasing: { fr: "Crédit-bail", ar: "الكراء المالي" },
  hasPledge: { fr: "Nantissement", ar: "الرهن" },
  fiscalDefault: { fr: "Défaillance fiscale", ar: "التقصير الجبائي" },
  mentionDate: { fr: "Date de mention", ar: "تاريخ التسمية" },
  uniqueIdentifier: { fr: "Identifiant unique", ar: "المعرف الفريد" },
  internalManagementNumber: { fr: "Numéro de gestion interne", ar: "رقم التصرف الداخلي" },
  registryType: { fr: "Type de registre", ar: "نوع السجل" },
  taxId: { fr: "Identifiant fiscal", ar: "المعرف الجبائي" },
  fullName: { fr: "Nom complet", ar: "الاسم الكامل" },
  fullNameAr: { fr: "Nom complet (arabe)", ar: "الاسم الكامل بالعربية" },
  firstName: { fr: "Prénom", ar: "الاسم" },
  lastName: { fr: "Nom", ar: "اللقب" },
  nationalId: { fr: "CIN", ar: "بطاقة التعريف الوطنية" },
  nationality: { fr: "Nationalité", ar: "الجنسية" },
  birthDate: { fr: "Date de naissance", ar: "تاريخ الولادة" },
  gender: { fr: "Genre", ar: "الجنس" },
  email: { fr: "Email", ar: "البريد الإلكتروني" },
  phone: { fr: "Téléphone", ar: "الهاتف" },
  address: { fr: "Adresse", ar: "العنوان" },
};

const FIELD_KEY_ALIASES: Partial<Record<string, CanonicalFieldKey>> = {
  denomination: "legalName",
  denominationSociale: "legalName",
  raisonSociale: "legalName",
  nom: "lastName",
  prenom: "firstName",
  nomPrenom: "fullName",
  nomEtPrenom: "fullName",
  cin: "nationalId",
  identifiantFiscal: "taxId",
  matriculeFiscal: "taxId",
  registreNationalDesEntreprises: "registryType",
  numeroRegistreNational: "uniqueIdentifier",
  numeroDeGestion: "internalManagementNumber",
  capitalSocial: "capitalAmount",
  activitePrincipale: "mainActivityLabel",
  codeActivite: "mainActivityCode",
  siegeSocial: "headquartersAddress",
  adresseActivite: "activityAddress",
  dateDebutActivite: "activityStartDate",
  etatRegistre: "registryState",
  dateDeNaissance: "birthDate",
  telephone: "phone",
  courriel: "email",
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

const FIELD_INDEX: ReadonlyMap<string, CanonicalFieldKey> = buildFieldIndex();

function buildFieldIndex(): Map<string, CanonicalFieldKey> {
  const index = new Map<string, CanonicalFieldKey>();

  for (const key of [...COMPANY_FIELD_KEYS, ...PERSON_FIELD_KEYS] as CanonicalFieldKey[]) {
    const label = FIELD_LABELS[key];
    index.set(normalizeToken(key), key);
    index.set(normalizeToken(label.fr), key);
    if (label.ar) {
      index.set(normalizeToken(label.ar), key);
    }
  }

  for (const [alias, key] of Object.entries(FIELD_KEY_ALIASES)) {
    if (key) {
      index.set(normalizeToken(alias), key);
    }
  }

  return index;
}

export function normalizeFieldKey(raw: string): CanonicalFieldKey | null {
  if (!raw) {
    return null;
  }
  return FIELD_INDEX.get(normalizeToken(raw)) ?? null;
}

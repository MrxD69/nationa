export type SeedDocumentType = {
  key: string;
  code: string;
  agencyId: string | null;
  nameFr: string;
  nameAr: string;
  description: string;
  acceptedMimeTypes: string[];
  requiredFields: string[];
  validityDays: number | null;
  source?: string;
  tokens?: string[];
};

const PDF = "application/pdf";
const JPEG = "image/jpeg";
const PNG = "image/png";

export const DOCUMENT_TYPES: SeedDocumentType[] = [
  {
    key: "doc_rne_extrait",
    code: "rne_extrait",
    agencyId: "RNE",
    nameFr: "Extrait du registre national des entreprises",
    nameAr: "مضمون السجل الوطني للمؤسسات",
    description:
      "Extrait officiel RNE (société) reflétant la situation juridique de l'entreprise à sa date de délivrance. Il porte un cachet électronique et un QR code de vérification.",
    acceptedMimeTypes: [PDF],
    requiredFields: ["uniqueIdentifier", "internalManagementNumber", "legalName"],
    validityDays: null,
  },
  {
    key: "doc_rne_extrait_complet",
    code: "rne_extrait_complet",
    agencyId: "RNE",
    nameFr: "Extrait complet du registre national des entreprises",
    nameAr: "مضمون شامل للسجل الوطني للمؤسسات",
    description:
      "Extrait complet comprenant les inscriptions, mentions, décisions judiciaires et établissements secondaires de l'entreprise.",
    acceptedMimeTypes: [PDF],
    requiredFields: ["uniqueIdentifier", "legalName"],
    validityDays: null,
  },
  {
    key: "doc_cin",
    code: "cin",
    agencyId: null,
    nameFr: "Carte d'identité nationale",
    nameAr: "بطاقة التعريف الوطنية",
    description:
      "Carte d'identité nationale tunisienne en cours de validité, utilisée pour l'identification des personnes physiques.",
    acceptedMimeTypes: [PDF, JPEG, PNG],
    requiredFields: ["nationalId", "fullName", "birthDate"],
    validityDays: null,
  },
  {
    key: "doc_passeport",
    code: "passeport",
    agencyId: null,
    nameFr: "Passeport",
    nameAr: "جواز السفر",
    description:
      "Passeport en cours de validité, requis pour les personnes de nationalité étrangère ou en complément de la CIN.",
    acceptedMimeTypes: [PDF, JPEG, PNG],
    requiredFields: ["fullName", "nationalId", "nationality", "birthDate"],
    validityDays: null,
  },
  {
    key: "doc_justificatif_adresse",
    code: "justificatif_adresse",
    agencyId: null,
    nameFr: "Justificatif de domicile",
    nameAr: "ما يثبت العنوان",
    description:
      "Justificatif d'adresse récent (facture STEG/SONEDE, contrat de bail, attestation de résidence) du siège social ou du domicile.",
    acceptedMimeTypes: [PDF, JPEG, PNG],
    requiredFields: ["address"],
    validityDays: 90,
  },
  {
    key: "doc_statuts",
    code: "statuts",
    agencyId: "RNE",
    nameFr: "Statuts de la société",
    nameAr: "النظام الأساسي للشركة",
    description:
      "Statuts constitutifs ou modifiés de la société, signés et datés, précisant la forme juridique, le capital et le siège social.",
    acceptedMimeTypes: [PDF],
    requiredFields: ["legalName", "legalForm", "capitalAmount", "headquartersAddress"],
    validityDays: null,
  },
  {
    key: "doc_attestation_banque",
    code: "attestation_banque",
    agencyId: "RNE",
    nameFr: "Attestation bancaire de dépôt de capital",
    nameAr: "شهادة بنكية بإيداع رأس المال",
    description:
      "Attestation délivrée par la banque justifiant le dépôt du capital social sur un compte bloqué au nom de la société en formation.",
    acceptedMimeTypes: [PDF],
    requiredFields: ["capitalAmount", "currency"],
    validityDays: 30,
  },
  {
    key: "doc_facture",
    code: "facture",
    agencyId: null,
    nameFr: "Facture",
    nameAr: "فاتورة",
    description:
      "Facture d'achat ou de prestation comportant les mentions légales obligatoires, l'identifiant fiscal et l'adresse.",
    acceptedMimeTypes: [PDF, JPEG, PNG],
    requiredFields: ["taxId", "legalName", "address"],
    validityDays: null,
  },
  {
    key: "doc_pv_assemblee_generale",
    code: "pv_assemblee_generale",
    agencyId: "RNE",
    nameFr: "Procès-verbal d'assemblée générale",
    nameAr: "محضر الجلسة العامة",
    description:
      "Procès-verbal d'assemblée générale des associés constatant les décisions statutaires soumises à inscription au RNE.",
    acceptedMimeTypes: [PDF],
    requiredFields: ["legalName"],
    validityDays: null,
  },
  {
    key: "doc_pv_nomination_gerant",
    code: "pv_nomination_gerant",
    agencyId: "RNE",
    nameFr: "Procès-verbal de nomination du gérant",
    nameAr: "محضر تعيين المتصرف",
    description:
      "Procès-verbal ou acte de nomination/révocation du gérant ou du représentant légal, avec acceptation du mandat.",
    acceptedMimeTypes: [PDF],
    requiredFields: ["fullName", "nationalId"],
    validityDays: null,
  },
  {
    key: "doc_declaration_beneficiaire",
    code: "declaration_beneficiaire",
    agencyId: "RNE",
    nameFr: "Déclaration du bénéficiaire effectif",
    nameAr: "تصريح المستفيد الحقيقي",
    description:
      "Déclaration identifiant les bénéficiaires effectifs et la nature du contrôle exercé sur la société.",
    acceptedMimeTypes: [PDF],
    requiredFields: ["fullName", "nationalId", "nationality"],
    validityDays: null,
  },
];

import type { JsonObject, ProcedureStepType } from "../types";

export type SeedProcedureStep = {
  key: string;
  position: number;
  code: string;
  titleFr: string;
  titleAr: string;
  description: string;
  stepType: ProcedureStepType;
  requiredDocumentTypeKey: string | null;
  formSchema: JsonObject | null;
  isOptional: boolean;
  citationKeys: string[];
};

export type SeedProcedureTemplate = {
  key: string;
  agencyId: string;
  obligationKey: string | null;
  code: string;
  nameFr: string;
  nameAr: string;
  description: string;
  category: string;
  estimatedDays: number | null;
  steps: SeedProcedureStep[];
};

export const PROCEDURE_TEMPLATES: SeedProcedureTemplate[] = [
  {
    key: "procedure_creation_societe",
    agencyId: "RNE",
    obligationKey: "obligation_rne_immatriculation_societe",
    code: "creation_societe",
    nameFr: "Création et immatriculation d'une société",
    nameAr: "تأسيس وتسجيل شركة",
    description:
      "Parcours complet d'immatriculation d'une nouvelle société au registre national des entreprises: saisie des informations, dépôt des statuts et pièces, paiement des frais, vérification et transmission au RNE.",
    category: "creation",
    estimatedDays: 10,
    steps: [
      {
        key: "step_creation_societe_info",
        position: 1,
        code: "information_generale",
        titleFr: "Informations générales",
        titleAr: "معلومات عامة",
        description:
          "Présentation des conditions, des pièces requises et des délais d'immatriculation au RNE.",
        stepType: "info",
        requiredDocumentTypeKey: null,
        formSchema: null,
        isOptional: false,
        citationKeys: ["loi52_2018_art_6_immatriculation", "rne_digitalisation"],
      },
      {
        key: "step_creation_societe_form",
        position: 2,
        code: "formulaire_constitution",
        titleFr: "Formulaire de constitution",
        titleAr: "استمارة التأسيس",
        description: "Saisie des informations d'identification de la société et des associés.",
        stepType: "form",
        requiredDocumentTypeKey: null,
        formSchema: {
          fields: [
            "legalName",
            "legalNameAr",
            "legalForm",
            "capitalAmount",
            "currency",
            "durationYears",
            "headquartersAddress",
            "mainActivityLabel",
            "mainActivityCode",
            "activityStartDate",
          ],
          required: [
            "legalName",
            "legalForm",
            "capitalAmount",
            "currency",
            "headquartersAddress",
            "mainActivityLabel",
          ],
        },
        isOptional: false,
        citationKeys: ["code_commerce_modifications_statutaires"],
      },
      {
        key: "step_creation_societe_upload_statuts",
        position: 3,
        code: "depot_statuts",
        titleFr: "Dépôt des statuts",
        titleAr: "إيداع النظام الأساسي",
        description: "Téléversement des statuts signés et datés de la société.",
        stepType: "upload",
        requiredDocumentTypeKey: "doc_statuts",
        formSchema: null,
        isOptional: false,
        citationKeys: ["code_commerce_modifications_statutaires"],
      },
      {
        key: "step_creation_societe_upload_banque",
        position: 4,
        code: "depot_attestation_banque",
        titleFr: "Attestation bancaire",
        titleAr: "الشهادة البنكية",
        description:
          "Téléversement de l'attestation bancaire justifiant le dépôt du capital social.",
        stepType: "upload",
        requiredDocumentTypeKey: "doc_attestation_banque",
        formSchema: null,
        isOptional: false,
        citationKeys: [],
      },
      {
        key: "step_creation_societe_upload_cin",
        position: 5,
        code: "depot_cin_dirigeant",
        titleFr: "Pièce d'identité du dirigeant",
        titleAr: "بطاقة تعريف المتصرف",
        description:
          "Téléversement de la carte d'identité nationale du gérant ou du représentant légal.",
        stepType: "upload",
        requiredDocumentTypeKey: "doc_cin",
        formSchema: null,
        isOptional: false,
        citationKeys: [],
      },
      {
        key: "step_creation_societe_upload_adresse",
        position: 6,
        code: "depot_justificatif_adresse",
        titleFr: "Justificatif d'adresse",
        titleAr: "ما يثبت العنوان",
        description: "Téléversement d'un justificatif de domicile du siège social.",
        stepType: "upload",
        requiredDocumentTypeKey: "doc_justificatif_adresse",
        formSchema: null,
        isOptional: false,
        citationKeys: [],
      },
      {
        key: "step_creation_societe_paiement",
        position: 7,
        code: "paiement_frais_rne",
        titleFr: "Paiement des frais d'immatriculation",
        titleAr: "دفع معاليم التسجيل",
        description:
          "Paiement en ligne des frais d'immatriculation dus au registre national des entreprises.",
        stepType: "payment",
        requiredDocumentTypeKey: null,
        formSchema: {
          fields: ["amount", "currency"],
          required: ["amount", "currency"],
        },
        isOptional: false,
        citationKeys: [],
      },
      {
        key: "step_creation_societe_review",
        position: 8,
        code: "verification_dossier",
        titleFr: "Vérification du dossier",
        titleAr: "التحقق من الملف",
        description: "Contrôle de la conformité et de la complétude du dossier par l'agent RNE.",
        stepType: "review",
        requiredDocumentTypeKey: null,
        formSchema: null,
        isOptional: false,
        citationKeys: [],
      },
      {
        key: "step_creation_societe_submission",
        position: 9,
        code: "transmission_rne",
        titleFr: "Transmission au RNE",
        titleAr: "الإرسال إلى السجل الوطني للمؤسسات",
        description:
          "Transmission électronique du dossier validé et délivrance de l'identifiant unique et du numéro de gestion interne.",
        stepType: "submission",
        requiredDocumentTypeKey: null,
        formSchema: null,
        isOptional: false,
        citationKeys: ["rne_digitalisation"],
      },
    ],
  },
];

import type { DocumentTemplateDef } from "./types";

export const pvNominationGerantTemplate: DocumentTemplateDef = {
  code: "pv_nomination_gerant",
  version: 1,
  documentTypeCode: "pv_nomination_gerant",
  defaultLanguage: "fr",
  title: {
    fr: "Procès-verbal de nomination du gérant",
    ar: "محضر تعيين المتصرف",
  },
  description: {
    fr: "Procès-verbal d'assemblée constatant la nomination (ou le renouvellement) du gérant et l'acceptation de son mandat.",
    ar: "محضر جلسة يثبت تعيين (أو تجديد) المتصرف وقبوله للمهمة.",
  },
  canonicalKeys: [
    "legalName",
    "legalNameAr",
    "uniqueIdentifier",
    "internalManagementNumber",
    "headquartersAddress",
    "fullName",
    "fullNameAr",
    "nationalId",
    "nationality",
    "birthDate",
    "address",
  ],
  citationKeys: [
    "code_commerce_modifications_statutaires",
    "code_commerce_art_17_etats_financiers",
  ],
  sections: [
    {
      id: "entete",
      title: { fr: "Identification de la société", ar: "تعريف الشركة" },
      blocks: [
        {
          type: "field",
          id: "legalName",
          key: "legalName",
          label: { fr: "Dénomination sociale", ar: "الاسم القانوني" },
          required: true,
        },
        {
          type: "field",
          id: "uniqueIdentifier",
          key: "uniqueIdentifier",
          label: { fr: "Identifiant unique RNE", ar: "المعرف الفريد بالسجل الوطني للمؤسسات" },
        },
        {
          type: "field",
          id: "internalManagementNumber",
          key: "internalManagementNumber",
          label: { fr: "Numéro de gestion interne", ar: "رقم التصرف الداخلي" },
        },
        {
          type: "field",
          id: "headquartersAddress",
          key: "headquartersAddress",
          label: { fr: "Siège social", ar: "المقر الاجتماعي" },
          format: "address",
        },
      ],
    },
    {
      id: "decision",
      title: { fr: "Décision de nomination", ar: "قرار التعيين" },
      blocks: [
        {
          type: "paragraph",
          id: "convocation",
          text: {
            fr: "L'assemblée des associés, régulièrement convoquée et réunie, a pris la décision suivante :",
            ar: "اجتمعت الجلسة العامة للشركاء بعد دعوتها بصفة قانونية واتخذت القرار التالي:",
          },
        },
        {
          type: "repeat",
          id: "managers_repeat",
          key: "managers",
          title: { fr: "Gérant(s) nommé(s)", ar: "المتصرف(ون) المعين(ون)" },
          itemLabel: { fr: "Gérant", ar: "متصرف" },
          fields: [
            {
              type: "field",
              id: "manager_fullName",
              key: "fullName",
              label: { fr: "Nom et prénom", ar: "الاسم واللقب" },
              required: true,
            },
            {
              type: "field",
              id: "manager_fullNameAr",
              key: "fullNameAr",
              label: { fr: "Nom et prénom (arabe)", ar: "الاسم واللقب بالعربية" },
            },
            {
              type: "field",
              id: "manager_nationalId",
              key: "nationalId",
              label: { fr: "CIN", ar: "بطاقة التعريف الوطنية" },
              required: true,
            },
            {
              type: "field",
              id: "manager_nationality",
              key: "nationality",
              label: { fr: "Nationalité", ar: "الجنسية" },
            },
            {
              type: "field",
              id: "manager_birthDate",
              key: "birthDate",
              label: { fr: "Date de naissance", ar: "تاريخ الولادة" },
              format: "date",
            },
            {
              type: "field",
              id: "manager_address",
              key: "address",
              label: { fr: "Adresse", ar: "العنوان" },
              format: "address",
            },
          ],
        },
        {
          type: "clause",
          id: "acceptation",
          title: { fr: "Acceptation du mandat", ar: "قبول المهمة" },
          text: {
            fr: "Le gérant nommé déclare accepter le mandat et n'être frappé d'aucune interdiction ou incompatibilité légale.",
            ar: "يصرح المتصرف المعين بقبوله المهمة وأنه غير مشمول بأي منع أو تناف قانوني.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
      ],
    },
    {
      id: "signatures",
      title: { fr: "Signatures", ar: "الإمضاءات" },
      blocks: [
        {
          type: "signature",
          id: "associes_signature",
          label: { fr: "Les associés", ar: "الشركاء" },
        },
        {
          type: "signature",
          id: "gerant_signature",
          label: { fr: "Le gérant nommé", ar: "المتصرف المعين" },
          role: { fr: "Pour acceptation du mandat", ar: "قبول المهمة" },
        },
      ],
    },
  ],
};

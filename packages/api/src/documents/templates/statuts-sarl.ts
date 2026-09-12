import type { DocumentTemplateDef } from "./types";

export const statutsSarlTemplate: DocumentTemplateDef = {
  code: "statuts_sarl",
  version: 1,
  documentTypeCode: "statuts",
  defaultLanguage: "fr",
  title: {
    fr: "Statuts de société à responsabilité limitée (SARL)",
    ar: "النظام الأساسي لشركة ذات مسؤولية محدودة",
  },
  description: {
    fr: "Statuts constitutifs d'une SARL conformes au droit tunisien, prêts à compléter et à signer.",
    ar: "النظام الأساسي التأسيسي لشركة ذات مسؤولية محدودة وفقا للقانون التونسي، جاهز للتعبئة والإمضاء.",
  },
  canonicalKeys: [
    "legalName",
    "legalNameAr",
    "tradeName",
    "legalForm",
    "capitalAmount",
    "currency",
    "durationYears",
    "headquartersAddress",
    "mainActivityLabel",
    "mainActivityCode",
    "uniqueIdentifier",
    "taxId",
    "fullName",
    "nationalId",
    "nationality",
    "address",
  ],
  citationKeys: [
    "code_commerce_modifications_statutaires",
    "code_commerce_art_17_etats_financiers",
    "loi_beneficiaire_effectif",
  ],
  sections: [
    {
      id: "identite",
      title: { fr: "Identité de la société", ar: "هوية الشركة" },
      blocks: [
        {
          type: "paragraph",
          id: "preambule",
          text: {
            fr: "Les soussignés ont établi ainsi qu'il suit les statuts de la société à responsabilité limitée qu'ils ont formée.",
            ar: "أعد الموقعون أدناه النظام الأساسي للشركة ذات المسؤولية المحدودة التي أسسوها على النحو التالي.",
          },
        },
        {
          type: "field",
          id: "legalName",
          key: "legalName",
          label: { fr: "Dénomination sociale", ar: "الاسم القانوني" },
          required: true,
        },
        {
          type: "field",
          id: "tradeName",
          key: "tradeName",
          label: { fr: "Nom commercial", ar: "الاسم التجاري" },
        },
        {
          type: "field",
          id: "legalForm",
          key: "legalForm",
          label: { fr: "Forme juridique", ar: "الشكل القانوني" },
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
          id: "taxId",
          key: "taxId",
          label: { fr: "Identifiant fiscal", ar: "المعرف الجبائي" },
        },
      ],
    },
    {
      id: "objet",
      title: { fr: "Objet et siège", ar: "الغرض والمقر" },
      blocks: [
        {
          type: "field",
          id: "mainActivityLabel",
          key: "mainActivityLabel",
          label: { fr: "Activité principale", ar: "النشاط الرئيسي" },
          format: "longtext",
        },
        {
          type: "field",
          id: "mainActivityCode",
          key: "mainActivityCode",
          label: { fr: "Code d'activité", ar: "رمز النشاط" },
        },
        {
          type: "field",
          id: "headquartersAddress",
          key: "headquartersAddress",
          label: { fr: "Siège social", ar: "المقر الاجتماعي" },
          format: "address",
          required: true,
        },
      ],
    },
    {
      id: "capital",
      title: { fr: "Capital social", ar: "رأس المال الاجتماعي" },
      blocks: [
        {
          type: "clause",
          id: "capital_clause",
          title: { fr: "Libération du capital", ar: "تأسيس رأس المال" },
          text: {
            fr: "Le capital social est constitué par les apports en numéraire et/ou en nature des associés. Les parts sont attribuées proportionnellement aux apports.",
            ar: "يتكون رأس المال الاجتماعي من الحصص النقدية و/أو العينية للشركاء. وتُمنح الحصص بما يتناسب مع الحصص المقدمة.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "field",
          id: "capitalAmount",
          key: "capitalAmount",
          label: { fr: "Montant du capital", ar: "مبلغ رأس المال" },
          format: "currency",
          required: true,
        },
        {
          type: "field",
          id: "currency",
          key: "currency",
          label: { fr: "Devise", ar: "العملة" },
        },
      ],
    },
    {
      id: "duree",
      title: { fr: "Durée et exercice social", ar: "المدة والسنة المالية" },
      blocks: [
        {
          type: "field",
          id: "durationYears",
          key: "durationYears",
          label: { fr: "Durée de la société (années)", ar: "مدة الشركة (بالسنوات)" },
          format: "number",
        },
        {
          type: "clause",
          id: "etats_financiers",
          title: { fr: "États financiers", ar: "القوائم المالية" },
          text: {
            fr: "La société clôture son exercice social et dépose ses états financiers dans les délais légaux.",
            ar: "تُختم الشركة سنتها المالية وتودع قوائمها المالية في الآجال القانونية.",
          },
          citationKeys: ["code_commerce_art_17_etats_financiers"],
        },
      ],
    },
    {
      id: "gerance",
      title: { fr: "Gérance", ar: "التصرف" },
      blocks: [
        {
          type: "repeat",
          id: "managers_repeat",
          key: "managers",
          title: { fr: "Gérant(s)", ar: "المتصرف(ون)" },
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
              id: "manager_nationalId",
              key: "nationalId",
              label: { fr: "CIN", ar: "بطاقة التعريف الوطنية" },
            },
            {
              type: "field",
              id: "manager_nationality",
              key: "nationality",
              label: { fr: "Nationalité", ar: "الجنسية" },
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
          id: "beneficiaires",
          title: { fr: "Bénéficiaires effectifs", ar: "المستفيدون الحقيقيون" },
          text: {
            fr: "La société identifie ses bénéficiaires effectifs et déclare la nature du contrôle exercé.",
            ar: "تحدد الشركة المستفيدين الحقيقيين لديها وتصرح بطبيعة التحكم الممارس.",
          },
          citationKeys: ["loi_beneficiaire_effectif"],
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
          role: {
            fr: "Signature précédée de la mention « lu et approuvé »",
            ar: "الإمضاء مسبوقا بعبارة « قُرئ وصُودق عليه »",
          },
        },
      ],
    },
  ],
};

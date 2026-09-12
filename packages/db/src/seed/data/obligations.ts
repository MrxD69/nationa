import type { JsonObject, ObligationPeriodicity } from "../types";

export type SeedObligation = {
  key: string;
  agencyId: string;
  code: string;
  nameFr: string;
  nameAr: string;
  description: string;
  legalBasis: string;
  periodicity: ObligationPeriodicity;
  deadlineRule: JsonObject;
  penaltySummary: string;
  appliesTo: JsonObject;
  citationKeys: string[];
};

export const OBLIGATIONS: SeedObligation[] = [
  {
    key: "obligation_rne_immatriculation_societe",
    agencyId: "RNE",
    code: "immatriculation_societe",
    nameFr: "Immatriculation d'une nouvelle société au RNE",
    nameAr: "تسجيل شركة جديدة بالسجل الوطني للمؤسسات",
    description:
      "Toute société nouvellement constituée doit requérir son immatriculation au registre national des entreprises et obtenir un identifiant unique ainsi qu'un numéro de gestion interne.",
    legalBasis: "Loi n° 2018-52 du 29 octobre 2018, art. 6; Code de commerce tunisien",
    periodicity: "one_off",
    deadlineRule: {
      type: "days_after_event",
      days: 30,
      event: "signature_acte_constitutif",
      reference: "date de constitution de la société",
    },
    penaltySummary:
      "Défaut d'immatriculation: impossibilité d'exercer légalement l'activité, amendes et rejet des demandes administratives et bancaires.",
    appliesTo: {
      entityTypes: ["company"],
      legalForms: ["SARL", "SUARL", "SA", "SAS", "SNC"],
      awareness: false,
    },
    citationKeys: [
      "loi52_2018_art_6_immatriculation",
      "rne_digitalisation",
      "code_commerce_modifications_statutaires",
    ],
  },
  {
    key: "obligation_rne_depot_etats_financiers",
    agencyId: "RNE",
    code: "depot_etats_financiers",
    nameFr: "Dépôt annuel des états financiers au RNE",
    nameAr: "إيداع القوائم المالية السنوية بالسجل الوطني للمؤسسات",
    description:
      "Les sociétés doivent déposer chaque année leurs états financiers auprès du registre national des entreprises dans le délai légal suivant la clôture de l'exercice.",
    legalBasis: "Code de commerce tunisien, art. 17; Loi n° 2018-52",
    periodicity: "annual",
    deadlineRule: {
      type: "annual",
      month: 6,
      day: 30,
      reference: "clôture de l'exercice",
      note: "dans les six mois suivant la clôture de l'exercice",
    },
    penaltySummary:
      "Défaut de dépôt: suspension possible du registre après 12 mois et amendes; radiation d'office en cas de défaut persistant.",
    appliesTo: {
      entityTypes: ["company"],
      awareness: false,
    },
    citationKeys: ["code_commerce_art_17_etats_financiers", "loi52_2018_suspension_12_mois"],
  },
  {
    key: "obligation_rne_declaration_beneficiaire_effectif",
    agencyId: "RNE",
    code: "declaration_beneficiaire_effectif",
    nameFr: "Déclaration du bénéficiaire effectif",
    nameAr: "التصريح بالمستفيد الحقيقي",
    description:
      "La société doit identifier et déclarer ses bénéficiaires effectifs ainsi que la nature du contrôle exercé, lors de la constitution et à chaque modification.",
    legalBasis: "Loi n° 2016-48 du 11 juillet 2016; Décret-loi n° 2019-114; formalités RNE",
    periodicity: "event_based",
    deadlineRule: {
      type: "days_after_event",
      days: 30,
      event: "constitution_ou_modification_du_controle",
      reference: "date de constitution ou de changement de contrôle",
    },
    penaltySummary:
      "Défaut ou retard de déclaration: sanctions administratives et suspension des formalités auprès du registre.",
    appliesTo: {
      entityTypes: ["company"],
      awareness: false,
    },
    citationKeys: ["loi_beneficiaire_effectif", "loi52_2018_art_6_immatriculation"],
  },
  {
    key: "obligation_rne_changement_dirigeant",
    agencyId: "RNE",
    code: "changement_dirigeant",
    nameFr: "Changement de gérant ou de représentant légal",
    nameAr: "تغيير المتصرف أو الممثل القانوني",
    description:
      "Toute nomination ou révocation d'un gérant, administrateur ou représentant légal doit être déclarée au registre national des entreprises avec les pièces justificatives.",
    legalBasis: "Code de commerce tunisien, art. 29; formalités RNE de modification",
    periodicity: "event_based",
    deadlineRule: {
      type: "days_after_event",
      days: 30,
      event: "nomination_ou_revocation",
      reference: "date de la décision sociale",
    },
    penaltySummary:
      "Défaut de déclaration: inopposabilité de la nomination aux tiers et amendes liées au retard d'inscription.",
    appliesTo: {
      entityTypes: ["company"],
      legalForms: ["SARL", "SUARL", "SA", "SAS", "SNC"],
      awareness: false,
    },
    citationKeys: ["code_commerce_modifications_statutaires", "rne_digitalisation"],
  },
  {
    key: "obligation_rne_changement_adresse",
    agencyId: "RNE",
    code: "changement_adresse",
    nameFr: "Changement d'adresse ou de siège social",
    nameAr: "تغيير العنوان أو المقر الاجتماعي",
    description:
      "Le transfert du siège social ou du lieu d'activité doit être déclaré au registre national des entreprises dans le délai légal.",
    legalBasis: "Code de commerce tunisien, art. 29; formalités RNE",
    periodicity: "event_based",
    deadlineRule: {
      type: "days_after_event",
      days: 30,
      event: "transfert_du_siege",
      reference: "date effective du transfert",
    },
    penaltySummary:
      "Défaut de déclaration: amendes et difficultés de notification des actes administratifs et fiscaux.",
    appliesTo: {
      entityTypes: ["company"],
      awareness: false,
    },
    citationKeys: ["code_commerce_modifications_statutaires"],
  },
  {
    key: "obligation_rne_dissolution_liquidation",
    agencyId: "RNE",
    code: "dissolution_liquidation",
    nameFr: "Inscription de la dissolution et de la liquidation",
    nameAr: "ترسيم الحل والتصفية",
    description:
      "La décision de dissolution et la nomination du liquidateur doivent être inscrites au registre national des entreprises, ainsi que la clôture de la liquidation.",
    legalBasis:
      "Code de commerce tunisien; loi n° 2018-52 relative au registre national des entreprises",
    periodicity: "one_off",
    deadlineRule: {
      type: "days_after_event",
      days: 30,
      event: "decision_de_dissolution",
      reference: "date de la décision de dissolution",
    },
    penaltySummary:
      "Défaut d'inscription: la dissolution reste inopposable aux tiers et la société demeure inscrite au registre.",
    appliesTo: {
      entityTypes: ["company"],
      awareness: false,
    },
    citationKeys: ["code_commerce_modifications_statutaires", "loi52_2018_art_6_immatriculation"],
  },
  {
    key: "obligation_rne_etablissement_secondaire",
    agencyId: "RNE",
    code: "etablissement_secondaire",
    nameFr: "Déclaration d'un établissement secondaire",
    nameAr: "التصريح بمؤسسة ثانوية",
    description:
      "L'ouverture, le transfert ou la fermeture d'un établissement secondaire doit être déclaré et inscrit au registre national des entreprises.",
    legalBasis: "Loi n° 2018-52; formalités RNE relatives aux établissements secondaires",
    periodicity: "event_based",
    deadlineRule: {
      type: "days_after_event",
      days: 30,
      event: "ouverture_ou_fermeture_etablissement_secondaire",
      reference: "date d'ouverture ou de fermeture",
    },
    penaltySummary:
      "Défaut de déclaration: amendes et difficultés lors des contrôles administratifs et fiscaux.",
    appliesTo: {
      entityTypes: ["company"],
      awareness: false,
    },
    citationKeys: ["code_commerce_modifications_statutaires", "rne_digitalisation"],
  },
  {
    key: "obligation_dgi_declaration_fiscale_mensuelle",
    agencyId: "DGI",
    code: "declaration_fiscale_mensuelle",
    nameFr: "Déclaration fiscale mensuelle (TVA, retenues à la source)",
    nameAr: "التصريح الجبائي الشهري (الأداء على القيمة المضافة والخصم من المصدر)",
    description:
      "Déclaration et paiement mensuels de la TVA et des retenues à la source auprès de la direction générale des impôts (obligation de sensibilisation).",
    legalBasis: "Code de l'IRPP et de l'IS, obligations déclaratives périodiques",
    periodicity: "monthly",
    deadlineRule: {
      type: "monthly",
      day: 20,
      note: "au plus tard le 20 du mois suivant la période",
    },
    penaltySummary:
      "Majorations, pénalités de retard et intérêts de retard en cas de déclaration tardive ou inexacte.",
    appliesTo: {
      entityTypes: ["company"],
      awareness: true,
      authority: "DGI",
    },
    citationKeys: ["code_irpp_is_declarations"],
  },
  {
    key: "obligation_dgi_declaration_fiscale_annuelle",
    agencyId: "DGI",
    code: "declaration_fiscale_annuelle",
    nameFr: "Déclaration annuelle de résultats (IS / IRPP)",
    nameAr: "التصريح السنوي بالنتائج (ضريبة الشركات / الضريبة على الدخل)",
    description:
      "Dépôt annuel de la déclaration de résultats et des états financiers auprès de l'administration fiscale (obligation de sensibilisation).",
    legalBasis: "Code de l'IRPP et de l'IS, déclaration annuelle de résultats",
    periodicity: "annual",
    deadlineRule: {
      type: "annual",
      month: 3,
      day: 25,
      reference: "exercice précédent",
    },
    penaltySummary:
      "Majorations d'assiette et pénalités en cas de dépôt hors délai; taxation d'office après mise en demeure.",
    appliesTo: {
      entityTypes: ["company"],
      awareness: true,
      authority: "DGI",
    },
    citationKeys: ["code_irpp_is_declarations", "code_commerce_art_17_etats_financiers"],
  },
  {
    key: "obligation_cnss_affiliation_employeur",
    agencyId: "CNSS",
    code: "affiliation_employeur",
    nameFr: "Affiliation de l'employeur à la CNSS",
    nameAr: "تسجيل صاحب العمل بالصندوق الوطني للضمان الاجتماعي",
    description:
      "Tout employeur doit s'affilier à la caisse nationale de sécurité sociale dès l'embauche de son premier salarié (obligation de sensibilisation).",
    legalBasis: "Loi n° 60-30 du 14 décembre 1960 relative à l'organisation de la sécurité sociale",
    periodicity: "one_off",
    deadlineRule: {
      type: "days_after_event",
      days: 30,
      event: "premier_emploi",
      reference: "date d'embauche du premier salarié",
    },
    penaltySummary: "Majorations de retard et sanctions en cas de non-affiliation de l'employeur.",
    appliesTo: {
      entityTypes: ["company"],
      awareness: true,
      authority: "CNSS",
    },
    citationKeys: ["loi_60_30_securite_sociale"],
  },
  {
    key: "obligation_cnss_cotisations_mensuelles",
    agencyId: "CNSS",
    code: "cotisations_mensuelles",
    nameFr: "Déclaration et paiement des cotisations sociales mensuelles",
    nameAr: "التصريح ودفع المساهمات الاجتماعية الشهرية",
    description:
      "Déclaration et paiement mensuels des cotisations sociales dues pour les salariés auprès de la CNSS (obligation de sensibilisation).",
    legalBasis: "Loi n° 60-30 du 14 décembre 1960 relative à l'organisation de la sécurité sociale",
    periodicity: "monthly",
    deadlineRule: {
      type: "monthly",
      day: 15,
      note: "déclaration et paiement avant le 15 du mois suivant",
    },
    penaltySummary:
      "Majorations et pénalités de retard; recouvrement forcé en cas de défaut prolongé.",
    appliesTo: {
      entityTypes: ["company"],
      awareness: true,
      authority: "CNSS",
    },
    citationKeys: ["loi_60_30_securite_sociale"],
  },
];

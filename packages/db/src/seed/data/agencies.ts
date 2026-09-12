export type SeedAgency = {
  id: string;
  nameFr: string;
  nameAr: string;
  nameEn: string;
  description: string;
  website: string;
  active: boolean;
};

export const AGENCIES: SeedAgency[] = [
  {
    id: "RNE",
    nameFr: "Registre National des Entreprises",
    nameAr: "السجل الوطني للمؤسسات",
    nameEn: "National Business Registry",
    description:
      "Organisme public chargé de l'immatriculation des entreprises et de la tenue du registre national des entreprises (RNE) en Tunisie, ainsi que de la délivrance des extraits et de l'enregistrement des modifications statutaires.",
    website: "https://www.registre-entreprises.tn",
    active: true,
  },
  {
    id: "DGI",
    nameFr: "Direction Générale des Impôts",
    nameAr: "المديرية العامة للجباية",
    nameEn: "General Directorate of Taxes",
    description:
      "Administration fiscale tunisienne responsable de l'assiette, du contrôle et du recouvrement de l'impôt, des déclarations périodiques et annuelles et de la délivrance de l'identifiant fiscal.",
    website: "https://www.impots.finances.gov.tn",
    active: true,
  },
  {
    id: "CNSS",
    nameFr: "Caisse Nationale de Sécurité Sociale",
    nameAr: "الصندوق الوطني للضمان الاجتماعي",
    nameEn: "National Social Security Fund",
    description:
      "Établissement public de sécurité sociale assurant l'affiliation des employeurs et la collecte des cotisations sociales des salariés en Tunisie.",
    website: "https://www.cnss.tn",
    active: true,
  },
  {
    id: "APII",
    nameFr: "Agence de Promotion de l'Industrie et de l'Innovation",
    nameAr: "وكالة النهوض بالصناعة والابتكار",
    nameEn: "Agency for the Promotion of Industry and Innovation",
    description:
      "Agence publique d'appui aux investissements industriels et à l'innovation, en charge notamment des avantages fiscaux et des autorisations pour les projets industriels.",
    website: "https://www.apii.tn",
    active: true,
  },
  {
    id: "BCT",
    nameFr: "Banque Centrale de Tunisie",
    nameAr: "البنك المركزي التونسي",
    nameEn: "Central Bank of Tunisia",
    description:
      "Institution financière publique responsable de la politique monétaire, de la régulation bancaire et des autorisations de change applicables aux entreprises.",
    website: "https://www.bct.gov.tn",
    active: true,
  },
];

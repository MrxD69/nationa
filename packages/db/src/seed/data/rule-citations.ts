export type SeedRuleCitation = {
  key: string;
  source: string;
  article: string | null;
  titleFr: string;
  titleAr: string;
  textFr: string;
  textAr: string;
  url: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export const RULE_CITATIONS: SeedRuleCitation[] = [
  {
    key: "loi52_2018_art_57_falsification",
    source: "Loi n° 2018-52 du 29 octobre 2018 relative au registre national des entreprises",
    article: "57",
    titleFr: "Falsification de l'extrait RNE",
    titleAr: "تدليس مضمون السجل الوطني للمؤسسات",
    textFr:
      "Toute falsification de l'extrait du registre national des entreprises est passible des peines prévues par l'article 57 de la loi n° 2018-52 du 29 octobre 2018.",
    textAr:
      "يعاقب كل من يدلس هذا المضمون بالعقوبات المنصوص عليها بالفصل 57 من القانون عدد 52 لسنة 2018 المؤرخ في 29 أكتوبر 2018.",
    url: "https://www.registre-entreprises.tn",
    effectiveFrom: "2018-10-29",
    effectiveTo: null,
  },
  {
    key: "loi52_2018_suspension_12_mois",
    source:
      "Extrait RNE — Loi n° 2018-52 du 29 octobre 2018 relative au registre national des entreprises",
    article: "12 mois",
    titleFr: "Suspension du registre après 12 mois de défaut fiscal",
    titleAr: "تعليق السجل بعد 12 شهرا من الإغفال الجبائي",
    textFr:
      "Le registre pourrait être suspendu après 12 mois à partir de la date de mention en cas de non-régularisation de la situation fiscale.",
    textAr:
      "يقع تعليق السجل 12 شهرا بعد تاريخ الإدراج في حال عدم الامتثال إلى تسوية الوضعية الجبائية.",
    url: "https://www.registre-entreprises.tn",
    effectiveFrom: "2018-10-29",
    effectiveTo: null,
  },
  {
    key: "loi52_2018_art_6_immatriculation",
    source: "Loi n° 2018-52 du 29 octobre 2018 relative au registre national des entreprises",
    article: "6",
    titleFr: "Obligation d'immatriculation au registre national des entreprises",
    titleAr: "إلزامية التسجيل بالسجل الوطني للمؤسسات",
    textFr:
      "Toute personne physique ou morale exerçant une activité économique est tenue de requérir son immatriculation au registre national des entreprises.",
    textAr:
      "يجب على كل شخص طبيعي أو معنوي يمارس نشاطا اقتصاديا أن يطلب تسجيله بالسجل الوطني للمؤسسات.",
    url: "https://www.registre-entreprises.tn",
    effectiveFrom: "2018-10-29",
    effectiveTo: null,
  },
  {
    key: "rne_digitalisation",
    source: "RNE — Loi n° 2018-52 du 29 octobre 2018 relative au registre national des entreprises",
    article: "7",
    titleFr: "Dématérialisation des formalités RNE",
    titleAr: "رقمنة إجراءات السجل الوطني للمؤسسات",
    textFr:
      "Les formalités d'immatriculation, de modification et de dépôt sont accomplies et traitées sous forme électronique via le portail du registre national des entreprises.",
    textAr:
      "تتم إجراءات التسجيل والتحيين والإيداع ومعالجتها إلكترونيا عبر بوابة السجل الوطني للمؤسسات.",
    url: "https://www.registre-entreprises.tn",
    effectiveFrom: "2018-10-29",
    effectiveTo: null,
  },
  {
    key: "code_commerce_art_17_etats_financiers",
    source: "Code de commerce tunisien",
    article: "17",
    titleFr: "Dépôt annuel des états financiers",
    titleAr: "إيداع القوائم المالية سنويا",
    textFr:
      "Les commerçants et sociétés tiennent une comptabilité régulière et déposent leurs états financiers annuels dans les délais légaux.",
    textAr:
      "يمسك التجار والشركات محاسبة منتظمة ويودعون قوائمهم المالية السنوية في الآجال القانونية.",
    url: null,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    key: "code_commerce_modifications_statutaires",
    source: "Code de commerce tunisien",
    article: "29",
    titleFr: "Inscription des modifications au registre",
    titleAr: "ترسيم التحيينات بالسجل",
    textFr:
      "Les changements affectant la société (dirigeants, siège, statuts, dissolution) doivent être déclarés et inscrits au registre compétent.",
    textAr:
      "يجب التصريح بالتغييرات التي تطرأ على الشركة (المتصرفون، المقر، النظام الأساسي، الحل) وترسيمها بالسجل المختص.",
    url: null,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    key: "code_irpp_is_declarations",
    source: "Code de l'IRPP et de l'IS",
    article: "60",
    titleFr: "Déclarations fiscales périodiques et annuelles",
    titleAr: "التصريحات الجبائية الدورية والسنوية",
    textFr:
      "Les entreprises déposent leurs déclarations fiscales périodiques (TVA, retenues à la source) et leur déclaration annuelle de résultats dans les délais fixés par l'administration fiscale.",
    textAr:
      "تودع المؤسسات تصريحاتها الجبائية الدورية (الأداء على القيمة المضافة والخصم من المصدر) وتصريحها السنوي بالنتائج في الآجال التي تحددها الإدارة الجبائية.",
    url: "https://www.impots.finances.gov.tn",
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    key: "loi_beneficiaire_effectif",
    source: "Loi n° 2016-48 et Décret-loi n° 2019-114",
    article: null,
    titleFr: "Déclaration des bénéficiaires effectifs",
    titleAr: "التصريح بالمستفيدين الحقيقيين",
    textFr:
      "Les sociétés sont tenues d'identifier et de déclarer leurs bénéficiaires effectifs ainsi que la nature du contrôle qu'ils exercent.",
    textAr:
      "تلتزم الشركات بتحديد المستفيدين الحقيقيين لديها والتصريح بهم وبطبيعة التحكم الذي يمارسونه.",
    url: null,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    key: "loi_60_30_securite_sociale",
    source: "Loi n° 60-30 du 14 décembre 1960 relative à l'organisation de la sécurité sociale",
    article: "49",
    titleFr: "Affiliation de l'employeur et cotisations sociales (CNSS)",
    titleAr: "تسجيل صاحب العمل والمساهمات الاجتماعية (الصندوق الوطني للضمان الاجتماعي)",
    textFr:
      "Tout employeur est tenu de s'affilier à la caisse de sécurité sociale compétente et de déclarer et payer les cotisations sociales dues pour ses salariés.",
    textAr:
      "يجب على كل صاحب عمل أن يسجل بالصندوق المختص بالضمان الاجتماعي وأن يصرح ويدفع المساهمات الاجتماعية المستوجبة على العملة.",
    url: "https://www.cnss.tn",
    effectiveFrom: null,
    effectiveTo: null,
  },
];

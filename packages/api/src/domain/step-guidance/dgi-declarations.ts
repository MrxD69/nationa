/**
 * Curated guidance for DGI declaration steps whose seeded description is empty.
 * Keys are `${templateCode}:${stepCode}`. French only.
 */
export const DGI_DECLARATION_STEP_GUIDANCE: Record<string, string> = {
  "declaration_existence_identifiant_fiscal:step_1":
    "Localisez le bureau de contrôle des impôts (BCI) dont dépend le lieu de l'activité ou du local. · Vérifiez son adresse et ses horaires sur le site de la DGI. · En cas de doute sur la compétence territoriale, contactez la recette des finances ou la DGI avant le dépôt.",
  "declaration_existence_identifiant_fiscal:step_3":
    "Rassemblez le contrat ou titre d'occupation du local, les justificatifs d'identité et les pièces liées à l'activité déclarée. · Vérifiez que chaque pièce est lisible et à jour. · Ajoutez toute autorisation ou registre exigé pour l'activité exercée.",
  "declaration_existence_identifiant_fiscal:step_7":
    "Présentez le dossier complet au bureau d'ordre du bureau de contrôle territorialement compétent. · Faites enregistrer le dépôt et conservez le récépissé ou l'accusé de réception. · Notez la référence attribuée pour suivre l'avancement du dossier.",
  "declaration_existence_identifiant_fiscal:step_8":
    "Préparez l'accès au local et la présence d'une personne responsable lors de la visite. · Présentez les pièces originales correspondant au dossier déposé. · Consignez les observations de l'agent et conservez une copie du rapport ou du procès-verbal.",

  "declaration_mensuelle_fiscale:step_1":
    "Précisez le mois ou la période déclarée. · Confirmez le régime fiscal applicable (réel ou autre) et les impôts concernés, notamment la TVA, les retenues à la source et la TCL. · Vérifiez l'identifiant fiscal et le bureau de contrôle compétent avant de commencer.",
  "declaration_mensuelle_fiscale:step_2":
    "Regroupez les factures de vente et les prestations du mois. · Rassemblez les factures d'achat et les charges supportées. · Classez à part les opérations exonérées, exportées ou hors champ afin de les traiter séparément.",
  "declaration_mensuelle_fiscale:step_3":
    "Déterminez la TVA collectée sur les ventes et prestations imposables du mois. · Totalisez la TVA déductible sur les achats et charges ouvrant droit à déduction. · Soustrayez la TVA déductible de la TVA collectée et reportez le crédit éventuel sur la période suivante.",
  "declaration_mensuelle_fiscale:step_4":
    "Recensez les paiements du mois soumis à retenue à la source, par exemple honoraires, loyers et commissions. · Appliquez à chaque catégorie la base et le taux correspondants. · Additionnez les retenues à verser pour la période.",
  "declaration_mensuelle_fiscale:step_5":
    "Vérifiez les autres taxes applicables à l'activité, notamment le droit de timbre, la TCL ou d'autres taxes locales. · Calculez chaque montant selon son assiette propre. · Additionnez-les au total à déclarer sans les confondre avec la TVA.",
  "declaration_mensuelle_fiscale:step_6":
    "Rapprochez les totaux déclarés des journaux de vente, d'achat et de paie. · Vérifiez les arrondis et l'équilibre entre la déclaration et la comptabilité. · Corrigez toute différence avant la validation.",
  "declaration_mensuelle_fiscale:step_7":
    "Reportez les montants calculés sur le formulaire de déclaration mensuelle. · Vérifiez l'identifiant fiscal, la période et chaque ligne avant validation. · Enregistrez le brouillon et corrigez les anomalies signalées.",
  "declaration_mensuelle_fiscale:step_8":
    "Déposez la déclaration via le portail de télédéclaration de la DGI lorsqu'il est applicable. · Sinon, déposez le formulaire auprès du bureau de contrôle compétent. · Conservez l'accusé de dépôt ou le récépissé avec sa référence.",
  "declaration_mensuelle_fiscale:step_9":
    "Réglez le montant indiqué par la déclaration selon le canal de paiement autorisé. · Vérifiez que le paiement correspond bien à la période et à la référence de la déclaration. · Conservez la quittance ou la preuve de paiement.",
  "declaration_mensuelle_fiscale:step_10":
    "Archivez la déclaration déposée et la preuve de paiement correspondante. · Classez-les par période pour faciliter les vérifications ultérieures. · Conservez une copie accessible pendant la durée de conservation légale.",

  "declaration_annuelle_irpp_is:step_1":
    "Arrêtez les comptes de l'exercice et établissez les états financiers. · Vérifiez les stocks, les provisions et les charges rattachées à l'exercice. · Faites valider la clôture avant de calculer le résultat fiscal.",
  "declaration_annuelle_irpp_is:step_3":
    "Partez du résultat comptable de l'exercice. · Réintégrez les charges non déductibles et déduisez les produits non imposables selon le régime applicable. · Obtenez le résultat fiscal à reporter sur la déclaration.",
  "declaration_annuelle_irpp_is:step_4":
    "Recensez les déductions et réintégrations prévues par le régime fiscal applicable. · Identifiez les crédits d'impôt et avantages dont bénéficie l'entreprise. · Documentez chaque retraitement afin de pouvoir le justifier en cas de contrôle.",
  "declaration_annuelle_irpp_is:step_5":
    "Appliquez au résultat fiscal les règles et taux correspondant au régime du contribuable, IRPP ou IS. · Tenez compte des taux spécifiques à certaines activités lorsqu'ils sont requis. · Obtenez l'impôt dû avant imputation des acomptes et des retenues.",
  "declaration_annuelle_irpp_is:step_6":
    "Additionnez les acomptes provisionnels et les retenues à la source déjà supportés par l'entreprise. · Imputez ces montants sur l'impôt définitif. · Déterminez le solde à payer ou le crédit à reporter.",
  "declaration_annuelle_irpp_is:step_7":
    "Reportez le résultat fiscal, l'impôt dû et les imputations sur la déclaration annuelle. · Joignez les états financiers et les annexes requis. · Vérifiez la cohérence avec la comptabilité avant validation.",
  "declaration_annuelle_irpp_is:step_8":
    "Déposez la déclaration annuelle via le portail de télédéclaration de la DGI lorsqu'il est applicable, ou auprès du bureau de contrôle compétent. · Vérifiez le délai légal en vigueur pour éviter tout dépôt tardif. · Conservez l'accusé de dépôt et sa référence.",
  "declaration_annuelle_irpp_is:step_9":
    "Payez le solde d'impôt indiqué par la déclaration, s'il y a lieu. · Effectuez le paiement selon le canal autorisé et rattachez-le à la déclaration. · Conservez la quittance de paiement.",

  "acomptes_provisionnels:step_1":
    "Indiquez l'exercice et la période d'acompte concernés. · Vérifiez l'identifiant fiscal et le régime appliqué au contribuable. · Préparez le formulaire correspondant sur le portail de télédéclaration de la DGI ou auprès du bureau compétent.",
  "acomptes_provisionnels:step_2":
    "Reprenez l'impôt dû au titre de l'exercice précédent servant de base au calcul. · Vérifiez ce montant dans la déclaration annuelle déjà déposée. · Retenez la base de référence selon la règle applicable au contribuable.",
  "acomptes_provisionnels:step_3":
    "Appliquez à l'impôt de référence le pourcentage ou la règle de calcul prévue pour le régime du contribuable. · Répartissez le montant selon le nombre d'acomptes dus pour l'exercice. · Vérifiez que le calcul correspond bien à l'échéance concernée.",
  "acomptes_provisionnels:step_4":
    "Identifiez les crédits et les retenues à la source pouvant être imputés sur l'acompte. · Soustrayez-les du montant calculé lorsqu'ils sont imputables. · Conservez les justificatifs de ces imputations.",
  "acomptes_provisionnels:step_5":
    "Reportez l'impôt de référence, l'acompte calculé et les imputations sur le formulaire de déclaration d'acompte. · Vérifiez la période et les montants ligne par ligne. · Validez le brouillon et corrigez les anomalies signalées.",
  "acomptes_provisionnels:step_6":
    "Déposez la déclaration d'acompte dans le mois d'échéance applicable. · Utilisez le portail de télédéclaration de la DGI lorsqu'il est disponible, sinon le bureau de contrôle compétent. · Conservez l'accusé de dépôt avec sa référence.",
  "acomptes_provisionnels:step_7":
    "Payez le montant de l'acompte selon le canal autorisé et dans l'échéance prévue. · Rattachez le paiement à la déclaration déposée. · Conservez la quittance ou la preuve de paiement.",
  "acomptes_provisionnels:step_8":
    "Archivez la déclaration d'acompte et la preuve de paiement. · Classez-les par exercice et par échéance. · Gardez-les accessibles pour la déclaration annuelle et les éventuels contrôles.",

  "retenue_a_la_source:step_1":
    "Qualifiez précisément le paiement : honoraires, commissions, loyers, revenus de capitaux, prestations ou autre catégorie. · Vérifiez le contrat ou la facture pour confirmer la nature du revenu. · La catégorie détermine le régime de retenue applicable.",
  "retenue_a_la_source:step_2":
    "Identifiez le statut du bénéficiaire, résident ou non résident, ainsi que sa nature, personne physique ou personne morale. · Vérifiez son identifiant fiscal lorsqu'il est disponible. · Ce statut conditionne le taux et les obligations déclaratives.",
  "retenue_a_la_source:step_3":
    "Vérifiez si l'opération atteint un seuil déclenchant la retenue. · Retenez le taux correspondant à la catégorie de revenu et au statut du bénéficiaire. · En cas de doute, consultez la DGI ou un conseil fiscal plutôt que de fixer un taux au hasard.",
  "retenue_a_la_source:step_4":
    "Déterminez la base fiscale de la retenue, par exemple le montant hors taxes selon la nature du revenu. · Appliquez le taux retenu à cette base. · Arrondissez et vérifiez le montant avant tout paiement.",
  "retenue_a_la_source:step_5":
    "Versez au bénéficiaire le montant diminué de la retenue. · Indiquez clairement le montant brut, la retenue et le net payé. · Conservez la preuve du paiement effectué au bénéficiaire.",
  "retenue_a_la_source:step_6":
    "Enregistrez la retenue dans un compte dédié lié à l'administration fiscale. · Rattachez l'écriture au paiement et à la facture concernés. · Suivez le solde des retenues restant à verser.",
  "retenue_a_la_source:step_7":
    "Reportez la retenue sur la déclaration fiscale de la période concernée. · Vérifiez que le montant déclaré correspond à la comptabilité. · Regroupez les retenues par catégorie si le formulaire le prévoit.",
  "retenue_a_la_source:step_8":
    "Versez le montant retenu à l'administration fiscale dans le délai applicable. · Utilisez le canal de paiement autorisé et rattachez le versement à la déclaration. · Conservez la quittance de versement.",
  "retenue_a_la_source:step_9":
    "Établissez un certificat de retenue pour chaque bénéficiaire. · Mentionnez le montant brut, la retenue et la période concernée. · Remettez le certificat au bénéficiaire et conservez-en une copie.",
  "retenue_a_la_source:step_10":
    "Comparez les certificats émis avec les retenues comptabilisées et déclarées. · Corrigez toute différence avant la clôture de la période. · Conservez la réconciliation comme justificatif.",
};

/**
 * Curated guidance for APII steps whose seeded description is empty.
 * Keys are `${templateCode}:${stepCode}`. French only (descriptions are not localized).
 */
export const APII_STEP_GUIDANCE: Record<string, string> = {
  // declaration_projet_investissement
  "declaration_projet_investissement:step_1":
    "Consultez la liste des activités industrielles et de services couvertes par le régime APII auprès de l'APII ou au Guichet Unique. · Vérifiez que le code d'activité de votre projet y figure. · En cas de doute, faites confirmer le classement par un agent du Guichet Unique avant de continuer.",
  "declaration_projet_investissement:step_3":
    "Réunissez les informations d'état civil du promoteur (identité, adresse, contact) et les données du projet : activité, investissement, financement, emplois et équipements. · Préparez le montant d'investissement et le plan de financement. · Gardez ces éléments à portée de main pour la saisie en ligne.",
  "declaration_projet_investissement:step_4":
    "Créez votre compte sur le service de déclaration en ligne de l'APII depuis le portail officiel de l'agence. · Notez soigneusement le numéro de dossier et le mot de passe affichés : ils servent à reprendre et suivre la déclaration. · Conservez-les de façon sécurisée.",
  "declaration_projet_investissement:step_5":
    "Sélectionnez sur l'écran de déclaration la qualité du promoteur (personne physique, société, etc.), la nature du projet et la forme juridique. · Choisissez la forme juridique correspondant à votre situation réelle. · En cas de doute sur l'une de ces options, consultez un agent du Guichet Unique avant de valider.",
  "declaration_projet_investissement:step_6":
    "Remplissez les écrans successifs du service en ligne : activité et code d'activité, montant d'investissement, schéma de financement, emplois prévus, équipements et matériel. · Renseignez chaque rubrique de façon cohérente avec votre projet. · Ne laissez pas de rubrique vide inutilement.",
  "declaration_projet_investissement:step_7":
    "Utilisez la fonction d'enregistrement du service en ligne après chaque écran rempli. · Le dossier peut être complété en plusieurs sessions avec le numéro de dossier et le mot de passe. · Reconnectez-vous quand vous voulez pour reprendre la saisie là où vous l'avez laissée.",
  "declaration_projet_investissement:step_9":
    "Relisez le récapitulatif du dossier puis validez la soumission depuis le service en ligne. · Vérifiez auparavant que toutes les pièces demandées y sont jointes. · Une fois soumise, notez la référence de dépôt générée.",
  "declaration_projet_investissement:step_10":
    "Reconnectez-vous au service de déclaration en ligne APII avec votre numéro de dossier et votre mot de passe. · Consultez régulièrement l'état d'avancement affiché. · Répondez rapidement si une information ou une pièce complémentaire est demandée.",
  "declaration_projet_investissement:step_12":
    "Consultez le mode de retrait indiqué par le service (téléchargement en ligne, retrait au Guichet Unique de l'APII ou envoi postal). · Téléchargez ou récupérez l'attestation selon le mode proposé. · Vérifiez que l'attestation correspond bien à votre dossier avant de la classer.",

  // declaration_activite_soumise_autorisation
  "declaration_activite_soumise_autorisation:step_3":
    "Ouvrez le formulaire de déclaration d'investissement du service en ligne APII. · Remplissez chaque rubrique (identité du promoteur, activité, investissement, financement, emplois, équipements). · Vérifiez la cohérence entre les montants et les données avant de passer à l'écran suivant.",
  "declaration_activite_soumise_autorisation:step_4":
    "Recopiez le libellé de l'activité tel qu'il figure dans l'autorisation, l'accord de principe ou le cahier des charges obtenu. · Évitez les formulations approximatives ou abrégées. · Utilisez le code d'activité correspondant pour éviter tout rejet à l'examen.",
  "declaration_activite_soumise_autorisation:step_8":
    "Déposez le dossier complet au guichet APII compétent ou via le service de déclaration en ligne lorsqu'il est ouvert. · Joignez les pièces demandées (identité, autorisation ou cahier des charges). · Récupérez le récépissé ou la référence de dépôt.",
  "declaration_activite_soumise_autorisation:step_9":
    "Suivez l'état du dossier depuis le service en ligne APII ou en vous adressant au guichet compétent. · Vérifiez si une pièce ou une précision complémentaire est demandée. · Donnez suite rapidement à toute demande pour éviter un blocage du dossier.",

  // extension_projet
  "extension_projet:step_1":
    "Rassemblez le dossier APII initial du projet existant : numéro de dossier, attestation de dépôt (ADD) et déclaration d'origine. · Identifiez l'activité concernée et le régime appliqué. · Ces références serviront à rattacher la déclaration d'extension au même projet.",
  "extension_projet:step_2":
    "Précisez par écrit ce que l'extension ajoute ou augmente : capacité de production, équipements, locaux, activité ou emplois. · Décrivez uniquement les éléments nouveaux par rapport au projet initial. · Joignez un plan ou un descriptif si cela aide à comprendre l'extension.",
  "extension_projet:step_3":
    "Chiffrez le montant d'investissement correspondant uniquement aux éléments de l'extension. · Additionnez équipements, matériel de transport, fonds de roulement et autres coûts prévus. · Conservez les factures, devis ou estimations justifiant ce montant.",
  "extension_projet:step_4":
    "Mettez à jour le plan de financement en intégrant le nouveau montant d'investissement de l'extension. · Indiquez les ressources propres et les crédits envisagés. · Vérifiez que le total des financements correspond au total des investissements.",
  "extension_projet:step_5":
    "Dressez la liste des nouveaux équipements et matériels ajoutés (désignation, nombre, coût estimatif). · Distinguez le matériel de production du matériel de transport. · Ajoutez devis ou factures pour chaque ligne importante.",
  "extension_projet:step_6":
    "Recalculez le nombre d'emplois créés par l'extension et le total des emplois du projet. · Indiquez les postes concernés et leur nature. · Vérifiez la cohérence avec le niveau d'investissement et d'activité décrit.",
  "extension_projet:step_8":
    "Déposez la déclaration d'extension auprès du service APII compétent ou via le service de déclaration en ligne. · Joignez les pièces mises à jour (investissement, financement, équipements, emplois). · Conservez le récépissé ou la référence de dépôt.",
  "extension_projet:step_9":
    "Suivez le traitement du dossier d'extension depuis l'espace en ligne APII ou auprès du guichet. · Consultez les demandes de complément éventuelles. · Fournissez rapidement les justificatifs réclamés pour ne pas retarder la décision.",

  // renouvellement_regime_projet
  "renouvellement_regime_projet:step_1":
    "Identifiez le projet concerné et le régime sous lequel il a été déclaré à l'APII. · Rassemblez le numéro de dossier, l'attestation (ADD) et la dernière décision obtenue. · Ces références permettent de retrouver votre dossier auprès du guichet.",
  "renouvellement_regime_projet:step_2":
    "Vérifiez la date d'expiration ou la période de validité du régime accordé à partir de vos documents APII. · Comparez-la à la date du jour pour déterminer s'il faut déposer le renouvellement. · En cas de doute, faites confirmer le délai à respecter par un agent du Guichet Unique APII.",
  "renouvellement_regime_projet:step_3":
    "Reprenez les informations et pièces du projet initial conservées lors de la première déclaration APII. · Rassemblez l'identité du promoteur, l'activité, l'investissement et l'attestation de dépôt. · Vérifiez que ces documents sont toujours lisibles et à jour.",
  "renouvellement_regime_projet:step_4":
    "Comparez les réalisations effectuées depuis la déclaration initiale (investissements engagés, équipements acquis, emplois créés) avec les prévisions. · Rassemblez les justificatifs correspondants. · Signalez les écarts importants à l'APII lors du dépôt.",
  "renouvellement_regime_projet:step_5":
    "Actualisez les données du projet : montant d'investissement réalisé, liste des équipements, emplois et situation d'avancement. · Corrigez les informations qui ont changé depuis la déclaration initiale. · Assurez la cohérence entre ces rubriques avant de déposer.",
  "renouvellement_regime_projet:step_7":
    "Déposez la demande de renouvellement auprès du service APII compétent ou via le service en ligne lorsqu'il est disponible. · Joignez les informations et justificatifs actualisés du projet. · Récupérez le récépissé ou la référence de dépôt.",
  "renouvellement_regime_projet:step_8":
    "Suivez le traitement du dossier de renouvellement depuis l'espace en ligne APII ou auprès du guichet. · Consultez régulièrement l'état d'avancement. · Notez toute demande formulée par l'administration.",
  "renouvellement_regime_projet:step_9":
    "Consultez les demandes de complément adressées par l'APII. · Préparez et transmettez les pièces ou précisions réclamées. · Respectez le délai indiqué pour ne pas voir le dossier suspendu.",
  "renouvellement_regime_projet:step_10":
    "Récupérez la décision ou l'attestation de renouvellement délivrée par l'APII selon le mode proposé. · Vérifiez que les informations qu'elle contient correspondent à votre projet. · Archivez l'original et gardez-en une copie.",

  // reconversion_regime_projet
  "reconversion_regime_projet:step_1":
    "Identifiez le projet existant concerné par la reconversion à partir de vos documents APII (numéro de dossier, attestation de dépôt, déclaration d'origine). · Précisez l'activité actuelle et le régime appliqué. · Ces références serviront à rattacher la demande au dossier existant.",
  "reconversion_regime_projet:step_2":
    "Décrivez le régime actuel du projet : activités déclarées, avantages ou formalités en cours. · Reprenez les éléments figurant dans votre dernière déclaration ou décision APII. · Cette description servira de point de comparaison pour la demande de reconversion.",
  "reconversion_regime_projet:step_3":
    "Décrivez clairement le nouveau régime ou la nouvelle orientation envisagée pour le projet. · Précisez la nouvelle activité, les équipements et l'organisation prévus. · Expliquez ce qui change par rapport au régime actuel.",
  "reconversion_regime_projet:step_4":
    "Vérifiez auprès de l'APII ou du Guichet Unique que la nouvelle activité envisagée figure parmi les activités éligibles aux formalités APII. · Contrôlez le code d'activité correspondant. · Si l'activité n'est pas éligible, demandez conseil avant de déposer la demande.",
  "reconversion_regime_projet:step_5":
    "Actualisez les données techniques et financières du projet pour la nouvelle orientation : investissement, équipements, financement et emplois. · Adaptez ces rubriques à la nouvelle activité. · Vérifiez la cohérence entre les montants et le descriptif.",
  "reconversion_regime_projet:step_6":
    "Identifiez les autorisations ou accords préalables exigés par la nouvelle activité (administrations sectorielles, cahier des charges). · Vérifiez si le régime actuel permet l'activité visée. · Rassemblez les pièces obtenues avant de déposer la demande.",
  "reconversion_regime_projet:step_7":
    "Rassemblez les pièces justificatives demandées par l'APII pour une reconversion : identité du promoteur, descriptif de la nouvelle activité, données financières et autorisations éventuelles. · Vérifiez que chaque document est lisible et complet. · Classez-les selon l'ordre demandé par le service.",
  "reconversion_regime_projet:step_8":
    "Déposez la demande de reconversion auprès du service APII compétent ou via le service de déclaration en ligne. · Joignez le descriptif du nouveau régime et les pièces justificatives. · Conservez le récépissé ou la référence de dépôt.",
  "reconversion_regime_projet:step_9":
    "Suivez le dossier de reconversion depuis le service en ligne APII lorsqu'il est disponible, ou en vous adressant au guichet compétent. · Consultez l'état d'avancement et les éventuelles demandes. · Répondez rapidement à toute demande de complément.",

  // obtenir_attestation_depot_declaration
  "obtenir_attestation_depot_declaration:step_1":
    "Achevez la saisie de la déclaration d'investissement sur le service en ligne APII. · Vérifiez que toutes les rubriques obligatoires sont remplies. · Enregistrez la dernière version du dossier avant de le soumettre.",
  "obtenir_attestation_depot_declaration:step_2":
    "Contrôlez la présence des informations et pièces obligatoires (identité du promoteur, données du projet, autorisation ou cahier des charges lorsque requis). · Vérifiez que les documents joints sont lisibles. · Corrigez toute rubrique incomplète avant la soumission.",
  "obtenir_attestation_depot_declaration:step_3":
    "Soumettez le dossier complet depuis le service de déclaration en ligne APII. · Attendez la confirmation d'envoi affichée par le service. · Notez la référence ou le numéro de dépôt généré.",
  "obtenir_attestation_depot_declaration:step_4":
    "Reconnectez-vous au portail APII avec votre numéro de dossier et votre mot de passe. · Consultez l'état d'avancement de la déclaration. · Vérifiez si l'attestation de dépôt (ADD) est disponible ou si une pièce est demandée.",
  "obtenir_attestation_depot_declaration:step_5":
    "Si des frais de délivrance sont applicables, réglez-les selon le mode indiqué par l'APII (paiement en ligne ou au guichet). · Conservez la preuve de paiement. · En cas de doute sur le montant ou le mode, renseignez-vous auprès du Guichet Unique.",
  "obtenir_attestation_depot_declaration:step_6":
    "Choisissez le mode de retrait proposé par le service : retrait au siège de l'APII, au Guichet Unique ou envoi par voie postale. · Indiquez l'adresse ou les coordonnées nécessaires si l'envoi postal est retenu. · Vérifiez le mode confirmé avant de quitter le service.",
  "obtenir_attestation_depot_declaration:step_8":
    "Archivez l'original de l'attestation de dépôt (ADD) et faites-en des copies. · Conservez-les avec les autres documents du projet. · Ces copies seront utiles pour vos démarches bancaires, fiscales ou administratives.",

  // creation_entreprise_individuelle_guichet
  "creation_entreprise_individuelle_guichet:step_1":
    "Vérifiez auprès du Guichet Unique de l'APII que l'activité envisagée relève des secteurs éligibles au dispositif. · Contrôlez le code d'activité correspondant. · En cas de doute, faites confirmer l'éligibilité par un agent avant de préparer le dossier.",
  "creation_entreprise_individuelle_guichet:step_5":
    "Identifiez les documents spécifiques exigés par l'activité (autorisation professionnelle, agrément, diplôme ou autres pièces réglementées). · Rassemblez-les en originaux et copies. · En cas de doute sur la liste, demandez la liste officielle des pièces au Guichet Unique.",
  "creation_entreprise_individuelle_guichet:step_6":
    "Déposez le dossier complet au Guichet Unique de l'APII. · Présentez l'identité du promoteur et les pièces spécifiques à l'activité. · Récupérez le récépissé de dépôt et notez les formalités restant à accomplir.",
  "creation_entreprise_individuelle_guichet:step_9":
    "Vérifiez si votre situation nécessite une affiliation à la CNSS et d'autres identifiants (numéro fiscal, registre national des entreprises le cas échéant). · Accomplissez les formalités correspondantes auprès des organismes concernés. · Conservez les justificatifs d'affiliation et d'immatriculation.",
  "creation_entreprise_individuelle_guichet:step_10":
    "Rassemblez et classez toutes les preuves de création de l'entreprise : attestation de dépôt, carte d'identification fiscale, affiliation CNSS et autres documents délivrés. · Conservez-en les originaux et des copies. · Ces pièces vous seront demandées dans vos démarches ultérieures.",

  // suivre_dossier_declaration_en_ligne
  "suivre_dossier_declaration_en_ligne:step_1":
    "Notez le numéro de dossier attribué lors de l'inscription sur le service de déclaration APII. · Conservez-le dans un endroit sûr. · Il est indispensable pour vous identifier et suivre votre dossier.",
  "suivre_dossier_declaration_en_ligne:step_2":
    "Conservez le mot de passe associé à votre numéro de dossier. · Ne le communiquez à personne. · En cas de perte, utilisez la procédure de récupération du portail ou adressez-vous au Guichet Unique APII.",
  "suivre_dossier_declaration_en_ligne:step_3":
    "Accédez au portail de déclaration en ligne de l'APII depuis le site officiel de l'agence. · Utilisez l'espace de suivi des dossiers de déclaration. · Vérifiez que vous êtes bien sur le portail officiel avant de saisir vos identifiants.",
  "suivre_dossier_declaration_en_ligne:step_4":
    "Saisissez votre numéro de dossier et le mot de passe associé dans l'espace de suivi APII. · Validez la connexion. · Si l'accès échoue, vérifiez les identifiants ou contactez le Guichet Unique.",
  "suivre_dossier_declaration_en_ligne:step_5":
    "Consultez l'état d'avancement affiché pour votre dossier (en cours, complément demandé, traité). · Lisez les éventuels messages de l'administration. · Revenez régulièrement pour suivre l'évolution.",
  "suivre_dossier_declaration_en_ligne:step_6":
    "Ouvrez la rubrique des messages ou des demandes du dossier. · Vérifiez si une information ou une pièce complémentaire est demandée. · Notez précisément la nature de la demande et le délai indiqué.",
  "suivre_dossier_declaration_en_ligne:step_7":
    "Ajoutez ou corrigez dans l'espace en ligne les informations ou pièces demandées par l'APII. · Joignez des documents lisibles correspondant exactement à la demande. · Enregistrez les modifications.",
  "suivre_dossier_declaration_en_ligne:step_8":
    "Cliquez sur l'enregistrement après chaque modification apportée au dossier. · Vérifiez que le message de confirmation s'affiche. · Ne quittez pas le service avant l'enregistrement effectif des changements.",
  "suivre_dossier_declaration_en_ligne:step_9":
    "Attendez la fin du traitement de votre dossier par l'APII. · Consultez l'espace en ligne pour suivre l'avancement. · Aucune démarche supplémentaire n'est nécessaire tant qu'aucune demande n'est formulée.",
  "suivre_dossier_declaration_en_ligne:step_10":
    "Téléchargez l'attestation ou la réponse délivrée depuis l'espace en ligne APII. · Si le retrait est prévu au guichet, présentez-vous au Guichet Unique muni de votre identité et de la référence de dossier. · Vérifiez le contenu du document reçu et archivez-le.",

  // projet_grand_investissement
  "projet_grand_investissement:step_1":
    "Additionnez l'ensemble des coûts du projet : équipements, matériel de transport, fonds de roulement et autres investissements prévus. · Utilisez des devis ou estimations justifiant chaque poste. · Vérifiez que le total correspond à la somme des rubriques avant de le saisir.",
  "projet_grand_investissement:step_2":
    "Identifiez le secteur d'activité du projet et le code d'activité correspondant utilisé par l'APII. · Vérifiez que l'activité relève des secteurs industriels ou de services couverts. · En cas de doute, faites confirmer le code par un agent du Guichet Unique.",
  "projet_grand_investissement:step_3":
    "Vérifiez si le montant ou la nature du projet atteint un seuil qui déclenche un examen spécifique (avis d'une instance ou d'une direction compétente). · Comparez votre montant d'investissement aux seuils communiqués par l'APII. · En cas de doute, interrogez le Guichet Unique sur la procédure applicable.",
  "projet_grand_investissement:step_4":
    "Préparez une fiche de projet décrivant l'activité, le produit ou service, le procédé technique, les capacités et le calendrier. · Rassemblez les données techniques et les plans nécessaires. · Assurez la cohérence entre la fiche et les montants déclarés.",
  "projet_grand_investissement:step_5":
    "Détaillez la liste des équipements et du matériel de transport : désignation, nombre, provenance et coût. · Ajoutez les devis ou factures justificatifs. · Vérifiez que chaque équipement est cohérent avec l'activité déclarée.",
  "projet_grand_investissement:step_6":
    "Chiffrez le fonds de roulement nécessaire au démarrage et au premier cycle d'exploitation. · Justifiez ce montant (charges, approvisionnements, salaires). · Vérifiez sa cohérence avec le niveau d'activité et les emplois prévus.",
  "projet_grand_investissement:step_7":
    "Détaillez le schéma de financement : apports propres, crédits bancaires et autres ressources. · Indiquez la part de chaque source dans le total. · Vérifiez que le total des financements couvre le total des investissements et le fonds de roulement.",
  "projet_grand_investissement:step_9":
    "Déposez la déclaration complète auprès du Guichet Unique de l'APII ou du service compétent. · Joignez la fiche de projet, les données financières et les justificatifs demandés. · Récupérez le récépissé ou la référence de dépôt.",
  "projet_grand_investissement:step_10":
    "Suivez l'examen du dossier depuis l'espace en ligne APII ou auprès du service compétent. · Répondez aux demandes d'information ou de complément formulées. · Attendez l'avis éventuel de la Direction Générale ou du ministère compétent avant de poursuivre.",
};

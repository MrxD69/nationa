import type { DocumentTemplateDef } from "./types";

export const statutsSarlTemplate: DocumentTemplateDef = {
  code: "statuts_sarl",
  version: 2,
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
    "fullNameAr",
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
          id: "legalNameAr",
          key: "legalNameAr",
          label: { fr: "Dénomination sociale (arabe)", ar: "الاسم القانوني بالعربية" },
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
      id: "associes",
      title: { fr: "Associés", ar: "الشركاء" },
      blocks: [
        {
          type: "paragraph",
          id: "entre_soussignes",
          text: {
            fr: "Entre les soussignés, les associés fondateurs de la société :",
            ar: "بين الموقعين أدناه، الشركاء المؤسسون للشركة:",
          },
        },
        {
          type: "repeat",
          id: "associates_repeat",
          key: "associates",
          title: { fr: "Associés et répartition des parts", ar: "الشركاء وتوزيع الحصص" },
          itemLabel: { fr: "Associé", ar: "شريك" },
          fields: [
            {
              type: "field",
              id: "associate_fullName",
              key: "fullName",
              label: { fr: "Nom et prénom", ar: "الاسم واللقب" },
              required: true,
            },
            {
              type: "field",
              id: "associate_nationalId",
              key: "nationalId",
              label: { fr: "CIN", ar: "بطاقة التعريف الوطنية" },
            },
            {
              type: "field",
              id: "associate_nationalIdIssuePlace",
              key: "nationalIdIssuePlace",
              label: { fr: "CIN délivrée à", ar: "مكان إسناد بطاقة التعريف" },
            },
            {
              type: "field",
              id: "associate_nationalIdIssueDate",
              key: "nationalIdIssueDate",
              label: { fr: "CIN délivrée le", ar: "تاريخ إسناد بطاقة التعريف" },
              format: "date",
            },
            {
              type: "field",
              id: "associate_nationality",
              key: "nationality",
              label: { fr: "Nationalité", ar: "الجنسية" },
            },
            {
              type: "field",
              id: "associate_maritalStatus",
              key: "maritalStatus",
              label: { fr: "Situation matrimoniale", ar: "الحالة المدنية" },
            },
            {
              type: "field",
              id: "associate_address",
              key: "address",
              label: { fr: "Adresse", ar: "العنوان" },
              format: "address",
            },
            {
              type: "field",
              id: "associate_partsCount",
              key: "partsCount",
              label: { fr: "Nombre de parts", ar: "عدد الحصص" },
              format: "number",
            },
            {
              type: "field",
              id: "associate_contributionAmount",
              key: "contributionAmount",
              label: { fr: "Apport", ar: "الحصة المقدمة" },
              format: "currency",
            },
            {
              type: "field",
              id: "associate_ownershipPercent",
              key: "ownershipPercent",
              label: { fr: "Pourcentage de détention", ar: "نسبة الملكية" },
              format: "number",
            },
          ],
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
        {
          type: "field",
          id: "totalParts",
          key: "totalParts",
          label: { fr: "Nombre total de parts", ar: "العدد الإجمالي للحصص" },
          format: "number",
        },
        {
          type: "field",
          id: "shareNominalValue",
          key: "shareNominalValue",
          label: { fr: "Valeur nominale d'une part", ar: "القيمة الاسمية للحصة" },
          format: "currency",
        },
        {
          type: "clause",
          id: "apports",
          title: { fr: "Apports", ar: "الحصص المقدمة" },
          text: {
            fr: "Le capital est constitué par l'ensemble des apports en numéraire et/ou en nature des associés. Les apports en numéraire sont mis à la disposition de la société par versement sur un compte bancaire ouvert à son nom.",
            ar: "يتكون رأس المال من مجموع الحصص النقدية و/أو العينية المقدمة من الشركاء. وتُوضع الحصص النقدية على ذمة الشركة عن طريق الإيداع في حساب بنكي مفتوح باسمها.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
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
        {
          type: "clause",
          id: "exercice_social",
          title: { fr: "Exercice social", ar: "السنة المالية" },
          text: {
            fr: "L'année sociale commence le 1er janvier et se termine le 31 décembre de chaque année. Le premier exercice comprend, par exception, le temps écoulé entre la constitution de la société et le 31 décembre suivant.",
            ar: "تبدأ السنة المالية في غرة جانفي وتنتهي في 31 ديسمبر من كل سنة. وتشمل السنة الأولى بصفة استثنائية المدة الفاصلة بين تأسيس الشركة و31 ديسمبر الموالي.",
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
              id: "manager_fullNameAr",
              key: "fullNameAr",
              label: { fr: "Nom et prénom (arabe)", ar: "الاسم واللقب بالعربية" },
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
          id: "mandat_gerant",
          title: { fr: "Mandat du gérant", ar: "مهمة المتصرف" },
          text: {
            fr: "Le gérant est nommé à durée déterminée ou indéterminée et révoqué par décision ordinaire des associés. Il dispose de la signature sociale et des pouvoirs les plus étendus pour agir au nom de la société en toutes circonstances et pour toutes opérations se rattachant à son objet social.",
            ar: "يُعيَّن المتصرف لمدة محددة أو غير محددة ويُعزل بقرار عادي من الشركاء. وله الإمضاء الاجتماعي وأوسع السلطات للتصرف باسم الشركة في جميع الظروف وفي كل العمليات المتصلة بغرضها الاجتماعي.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "clause",
          id: "associes_droits",
          title: { fr: "Droits des associés", ar: "حقوق الشركاء" },
          text: {
            fr: "Chaque associé dispose d'autant de voix qu'il possède de parts. Les associés ne sont responsables qu'à concurrence du montant de leurs parts; au-delà, tout appel de fonds est interdit.",
            ar: "لكل شريك عدد من الأصوات يساوي عدد الحصص التي يملكها. ولا يسأل الشركاء إلا في حدود مبلغ حصصهم، ويمنع كل طلب للأموال يتجاوز ذلك.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "clause",
          id: "decisions_societe",
          title: { fr: "Décisions de la société", ar: "قرارات الشركة" },
          text: {
            fr: "Les décisions collectives des associés résultent d'un commun accord ou d'un vote individuel formulé par écrit et transmis à la gérance. Le vote est exclusivement personnel et ne peut être exercé par mandataire.",
            ar: "تنتج القرارات الجماعية للشركاء عن توافق مشترك أو تصويت فردي محرر كتابةً ويُوجَّه إلى الإدارة. والتصويت شخصي حصرا ولا يمكن ممارسته بوكالة.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
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
      id: "parts_sociales",
      title: { fr: "Parts sociales et cession", ar: "الحصص الاجتماعية والتفويت" },
      blocks: [
        {
          type: "clause",
          id: "parts_indivisibles",
          title: { fr: "Parts sociales", ar: "الحصص الاجتماعية" },
          text: {
            fr: "Les parts sont indivisibles et la société ne reconnaît qu'un propriétaire pour chaque part. Chaque part donne droit à une fraction proportionnelle de l'actif social ainsi qu'à une part dans les bénéfices.",
            ar: "الحصص غير قابلة للتجزئة ولا تعترف الشركة إلا بمالك واحد لكل حصة. وتمنح كل حصة الحق في نصيب متناسب من أصول الشركة وفي نصيب من الأرباح.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "clause",
          id: "cession_parts",
          title: { fr: "Cession de parts sociales", ar: "تفويت الحصص الاجتماعية" },
          text: {
            fr: "La cession de parts entre associés est libre après consentement écrit de la gérance. Si le cessionnaire est étranger à la société, la cession n'est valable qu'avec le consentement de la majorité des associés représentant au moins les trois quarts du capital social. Les cessions sont constatées par un acte authentique ou sous seing privé comportant une signature légalisée.",
            ar: "يُعد تفويت الحصص بين الشركاء حرّا بعد موافقة كتابية من الإدارة. وإذا كان المحال إليه أجنبيا عن الشركة فلا يصح التفويط إلا بموافقة أغلبية الشركاء الممثلين لثلاثة أرباع رأس المال الاجتماعي على الأقل. ويُثبت التفويط بعقد رسمي أو عرفي يتضمن إمضاء مصادقا عليه.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
      ],
    },
    {
      id: "augmentation_capital",
      title: { fr: "Augmentation du capital", ar: "الزيادة في رأس المال" },
      blocks: [
        {
          type: "clause",
          id: "augmentation_capital_clause",
          title: { fr: "Augmentation du capital", ar: "الزيادة في رأس المال" },
          text: {
            fr: "Le capital social peut être augmenté, en une ou plusieurs fois, par la création de parts nouvelles en représentation d'apports en nature ou en espèces, par l'application des fonds disponibles des comptes de réserves ou par tout autre moyen, en vertu d'une délibération des associés. Les parts attribuées lors de l'augmentation du capital doivent être entièrement libérées.",
            ar: "يمكن الزيادة في رأس المال الاجتماعي، مرة أو عدة مرات، بإحداث حصص جديدة مقابل حصص عينية أو نقدية، أو بتوظيف الأموال المتوفرة في حسابات الاحتياطي أو بأي وسيلة أخرى، بموجب مداولة من الشركاء. ويجب أن تكون الحصص الممنوحة عند الزيادة في رأس المال مؤسسة بالكامل.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
      ],
    },
    {
      id: "resultats",
      title: { fr: "Exercice social et bénéfices", ar: "السنة المالية والأرباح" },
      blocks: [
        {
          type: "clause",
          id: "repartition_benefices",
          title: { fr: "Répartition des bénéfices", ar: "توزيع الأرباح" },
          text: {
            fr: "Il est prélevé sur les bénéfices nets 5 % pour constituer le fonds de réserve légal; ce prélèvement cesse d'être obligatoire lorsque le fonds atteint le dixième du capital social. Le solde des bénéfices est réparti entre les associés proportionnellement au nombre de parts appartenant à chacun d'eux. Les pertes, s'il en existe, sont supportées par les associés dans la même proportion, sans qu'aucun d'eux puisse être tenu au-delà du montant de ses parts.",
            ar: "يُخصَّص من الأرباح الصافية 5% لتكوين احتياطي قانوني، ويتوقف هذا الخصم عن أن يكون إلزاميا عندما يبلغ الاحتياطي عشر رأس المال الاجتماعي. ويُوزَّع الباقي من الأرباح على الشركاء بما يتناسب مع عدد الحصص التي يملكها كل منهم. وتُحمَّل الخسائر، إن وُجدت، على الشركاء بالنسب ذاتها دون أن يُلزم أي منهم بما يتجاوز مبلغ حصصه.",
          },
          citationKeys: ["code_commerce_art_17_etats_financiers"],
        },
      ],
    },
    {
      id: "dispositions_finales",
      title: { fr: "Dispositions finales", ar: "أحكام ختامية" },
      blocks: [
        {
          type: "clause",
          id: "prorogation",
          title: { fr: "Prorogation", ar: "التمديد" },
          text: {
            fr: "À l'expiration du terme statutaire, la prorogation de la société peut être décidée par les associés statuant à la majorité requise pour la modification des statuts.",
            ar: "عند انتهاء المدة القانونية للشركة، يمكن للشركاء أن يقرروا تمديدها بأغلبية تصويتهم طبقا للشروط المطلوبة لتعديل النظام الأساسي.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "clause",
          id: "dissolution",
          title: { fr: "Dissolution", ar: "حل الشركة" },
          text: {
            fr: "La société est dissoute à l'arrivée du terme statutaire de sa durée, sauf prorogation, et à la survenance d'une cause légale de dissolution. Elle n'est pas dissoute par la faillite, l'incapacité ou le décès d'un associé.",
            ar: "تُحل الشركة عند انتهاء المدة القانونية المحددة لمدتها، ما لم تُمدَّد، وعند تحقق سبب قانوني للحل. ولا تُحل بفلس أو عدم أهلية أو وفاة أحد الشركاء.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "clause",
          id: "liquidation",
          title: { fr: "Liquidation", ar: "التصفية" },
          text: {
            fr: "À l'expiration de la durée de la société ou en cas de dissolution anticipée, le produit net de la liquidation est employé d'abord au remboursement du montant des parts sociales, si ce remboursement n'a pas encore été opéré. Le surplus est réparti entre les associés, gérants ou non, au prorata du nombre de parts appartenant à chacun d'eux.",
            ar: "عند انتهاء مدة الشركة أو في حالة الحل المسبق، يُخصص الناتج الصافي للتصفية أولا لسداد مبلغ الحصص الاجتماعية إن لم يكن قد تم بعد. ويُوزَّع الفائض على الشركاء، متصرفين كانوا أو غير متصرفين، بنسبة عدد الحصص التي يملكها كل منهم.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "clause",
          id: "pertes_fonds_propres",
          title: {
            fr: "Pertes rendant les fonds propres inférieurs à la moitié du capital social",
            ar: "الخسائر التي تجعل الأموال الذاتية أقل من نصف رأس المال الاجتماعي",
          },
          text: {
            fr: "Si les documents comptables font apparaître que les fonds propres de la société sont inférieurs de moitié au capital social, une assemblée générale extraordinaire est convoquée dans les deux mois de la constatation des pertes pour se prononcer, s'il y a lieu, sur la dissolution anticipée. Si la dissolution n'est pas décidée, la société est tenue, au plus tard à la clôture de l'exercice suivant, de réduire ou d'augmenter son capital d'un montant au moins égal à celui des pertes.",
            ar: "إذا ظهر من الوثائق المحاسبية أن الأموال الذاتية للشركة أقل من نصف رأس المال الاجتماعي، تُدعى جلسة عامة خارقة للعادة داخل شهرين من معاينة الخسائر للبتّ عند الاقتضاء في الحل المسبق. وإذا لم يُقرر الحل، وجب على الشركة في موعد أقصاه ختم السنة المالية الموالية تخفيض رأس مالها أو الزيادة فيه بمبلغ يعادل الخسائر على الأقل.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "clause",
          id: "transformation",
          title: { fr: "Transformation de la société", ar: "تحويل الشركة" },
          text: {
            fr: "La transformation de la société en société anonyme ne peut être proposée qu'après approbation des associés des résultats d'au moins deux exercices précédents. Elle est décidée par l'assemblée générale extraordinaire après présentation d'un rapport spécial rédigé par un expert-comptable sur la situation de la société.",
            ar: "لا يمكن اقتراح تحويل الشركة إلى شركة مجهولة الاسم إلا بعد مصادقة الشركاء على نتائج سنتين ماليتين سابقتين على الأقل. ويُقرر ذلك في جلسة عامة خارقة للعادة بعد تقديم تقرير خاص يحرره خبير محاسب حول وضعية الشركة.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "clause",
          id: "contestations",
          title: { fr: "Contestations", ar: "النزاعات" },
          text: {
            fr: "Toutes les contestations qui pourront s'élever entre les associés durant la vie de la société ou lors de la liquidation, relatives aux affaires sociales, seront soumises à la juridiction des tribunaux de Tunisie.",
            ar: "تُعرض كل النزاعات التي قد تنشأ بين الشركاء خلال حياة الشركة أو عند تصفيتها والمتعلقة بالشؤون الاجتماعية على اختصاص محاكم تونس.",
          },
        },
        {
          type: "clause",
          id: "publication",
          title: { fr: "Publication", ar: "النشر" },
          text: {
            fr: "Tout porteur d'une copie originale des présents statuts, des décisions ultérieures ou d'un extrait de ces documents est autorisé à accomplir les formalités de dépôt et de publication.",
            ar: "يُرخَّص لكل حامل لنسخة أصلية من هذا النظام الأساسي أو من القرارات اللاحقة أو من مستخرج منها بالقيام بإجراءات الإيداع والنشر.",
          },
          citationKeys: ["code_commerce_modifications_statutaires"],
        },
        {
          type: "clause",
          id: "frais",
          title: { fr: "Frais", ar: "المصاريف" },
          text: {
            fr: "Les frais des présents statuts sont supportés par la société et portés à son compte d'exploitation générale.",
            ar: "تتحمل الشركة مصاريف هذا النظام الأساسي وتُدرج بحساب استغلالها العام.",
          },
        },
        {
          type: "field",
          id: "signatureDate",
          key: "signatureDate",
          label: { fr: "Fait à Tunis le", ar: "حرر بتونس في" },
          format: "date",
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
        {
          type: "signature",
          id: "gerant_signature",
          label: { fr: "Le gérant", ar: "المتصرف" },
          role: { fr: "Pour acceptation du mandat", ar: "قبول المهمة" },
        },
      ],
    },
  ],
};

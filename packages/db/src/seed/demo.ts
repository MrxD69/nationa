import "varlock/auto-load";

import { and, eq, notInArray, sql, type SQL } from "drizzle-orm";

import {
  activityEvents,
  agencies,
  agencyMemberships,
  caseFieldValues,
  caseSteps,
  cases,
  checkRuns,
  companies,
  companyAccessGrants,
  companyPersons,
  companyRegistrySnapshots,
  createDb,
  documentLinks,
  documentTypes,
  documentVersions,
  documents,
  fieldProvenance,
  filingInvoices,
  filings,
  findingNotes,
  findings,
  invoiceLines,
  invoices,
  notifications,
  obligations,
  persons,
  procedureSteps,
  procedureTemplates,
  profiles,
  reviews,
  submissions,
  submissionDocuments,
  type OnboardingAnswers,
} from "../index";
import {
  ACCOUNTANT_SCOPES,
  COMPANY_CARTHAGE,
  COMPANY_IMPERIAL,
  DEMO_INVOICES,
  DEMO_USER_ID,
  OWNER_SCOPES,
  PERSONS,
} from "./demo/data";
import { seedId } from "./ids";

const db = createDb({ DATABASE_URL: process.env.DATABASE_URL || "" });

const userId = process.argv[2]?.trim() || process.env.DEMO_USER_ID?.trim() || DEMO_USER_ID;

const DEMO_ROLES = ["owner", "accountant", "officer", "admin"] as const;
type DemoRole = (typeof DEMO_ROLES)[number];

function readDemoRole(): DemoRole {
  const raw = (process.env.DEMO_ROLE ?? process.argv[3] ?? "owner").trim().toLowerCase();
  if ((DEMO_ROLES as readonly string[]).includes(raw)) {
    return raw as DemoRole;
  }
  throw new Error(
    `[demo-seed] Invalid DEMO_ROLE "${raw}". Expected one of: ${DEMO_ROLES.join(", ")}.`,
  );
}

const role = readDemoRole();
const isSelfServe = role === "owner" || role === "accountant";
/*
 * The demo back-office persona is seeded as a supervisor, not a plain officer.
 * `officer.analytics.read` is granted to supervisor and admin only, so an
 * officer-role demo user sees a FORBIDDEN error on the analytics page even
 * though the analytics data is seeded and present.
 */
const agencyMembershipRole = role === "admin" ? "admin" : "supervisor";

const id = (key: string) => seedId(`demo:${key}`);
const at = (iso: string) => new Date(iso);

// Stable timestamps so repeated runs leave rows byte-for-byte identical.
const T = {
  profileConsent: at("2025-09-13T07:00:00.000Z"),
  profileCompleted: at("2025-09-13T07:00:00.000Z"),
  companyCreated: at("2025-06-02T09:00:00.000Z"),
  carthageCreated: at("2024-03-15T09:00:00.000Z"),
  personCreated: at("2025-05-15T09:00:00.000Z"),
  grant: at("2025-06-02T09:05:00.000Z"),
  caseCreated: at("2026-06-10T08:30:00.000Z"),
  caseUpdated: at("2026-06-12T14:10:00.000Z"),
  step1Started: at("2026-06-10T08:35:00.000Z"),
  step1Done: at("2026-06-10T09:00:00.000Z"),
  step2Started: at("2026-06-11T09:00:00.000Z"),
  step3Started: at("2026-06-11T09:30:00.000Z"),
  doc1Uploaded: at("2026-06-11T10:00:00.000Z"),
  doc2Uploaded: at("2026-06-10T09:30:00.000Z"),
  snapshot: at("2026-06-02T10:00:00.000Z"),
  checkRun: at("2026-06-12T14:05:00.000Z"),
  submissionInReview: at("2026-06-11T15:00:00.000Z"),
  submissionApproved: at("2026-05-02T11:00:00.000Z"),
  submissionDgi: at("2026-06-15T09:00:00.000Z"),
  reviewApproved: at("2026-05-04T09:30:00.000Z"),
  officerSince: at("2026-05-01T08:00:00.000Z"),
  clientCaseCreated: at("2026-05-20T08:00:00.000Z"),
  clientCaseUpdated: at("2026-05-22T10:00:00.000Z"),
  clientDocUploaded: at("2026-05-21T09:00:00.000Z"),
  invoice: at("2026-06-01T08:00:00.000Z"),
  filing: at("2026-06-01T08:00:00.000Z"),
};

// Deterministic ids.
const ID = {
  companyImperial: id("company_imperial"),
  companyCarthage: id("company_carthage"),
  personAmel: id("person_amel"),
  personAhmed: id("person_ahmed"),
  personSonia: id("person_sonia"),
  companyPersonImperialOwner: id("company_person_imperial_owner"),
  companyPersonImperialManager: id("company_person_imperial_manager"),
  companyPersonCarthageManager: id("company_person_carthage_manager"),
  snapshotImperial: id("snapshot_imperial"),
  docExtract: id("document_rne_extract"),
  docStatuts: id("document_statuts"),
  versionExtract: id("document_version_rne_extract"),
  versionStatuts: id("document_version_statuts"),
  carthageDocExtract: id("document_carthage_rne_extract"),
  carthageDocStatuts: id("document_carthage_statuts"),
  carthageVersionExtract: id("document_version_carthage_rne_extract"),
  carthageVersionStatuts: id("document_version_carthage_statuts"),
  caseChangeManager: id("case_change_manager"),
  caseCarthageChangeManager: id("case_carthage_change_manager"),
  checkRun: id("check_run_case"),
  findingRequiredDoc: id("finding_required_document_missing"),
  findingNameMismatch: id("finding_company_name_mismatch"),
  findingCapital: id("finding_capital_mismatch"),
  findingNoteBlocker: id("finding_note_blocker"),
  findingNoteName: id("finding_note_name"),
  submissionInReview: id("submission_in_review"),
  submissionApproved: id("submission_approved"),
  submissionDgiQueued: id("submission_dgi_queued"),
  reviewApproved: id("review_approved"),
  filingDgi: id("filing_dgi_monthly"),
  notificationReview: id("notification_review_decision"),
  notificationCheck: id("notification_check_failed"),
  notificationDocument: id("notification_document_processed"),
  notificationDeadline: id("notification_deadline_reminder"),
  activityReview: id("activity_submission_approved"),
  activityCheck: id("activity_check_failed"),
  activityDocument: id("activity_document_generated"),
  activityCase: id("activity_case_created"),
};

const CLIENT_COMPANIES = [ID.companyCarthage];

const COMPANY_ID_BY_KEY = {
  company_imperial: ID.companyImperial,
  company_carthage: ID.companyCarthage,
} as const;

type Catalog = {
  rneAgencyId: string;
  dgiAgencyId: string;
  docTypeExtractId: string;
  docTypeStatutsId: string;
  templateId: string;
  steps: Array<typeof procedureSteps.$inferSelect>;
  monthlyObligationId: string;
};

async function loadCatalog(): Promise<Catalog> {
  const [rne] = await db.select().from(agencies).where(eq(agencies.id, "RNE")).limit(1);
  if (!rne) {
    throw new Error('[demo-seed] Missing agency "RNE". Run `pnpm db:seed` first.');
  }

  const [dgi] = await db.select().from(agencies).where(eq(agencies.id, "DGI")).limit(1);
  if (!dgi) {
    throw new Error('[demo-seed] Missing agency "DGI". Run `pnpm db:seed` first.');
  }

  const [docExtract] = await db
    .select()
    .from(documentTypes)
    .where(and(eq(documentTypes.agencyId, "RNE"), eq(documentTypes.code, "rne_extrait")))
    .limit(1);
  if (!docExtract) {
    throw new Error(
      '[demo-seed] Missing document type "RNE/rne_extrait". Run `pnpm db:seed` first.',
    );
  }

  const [docStatuts] = await db
    .select()
    .from(documentTypes)
    .where(and(eq(documentTypes.agencyId, "RNE"), eq(documentTypes.code, "statuts")))
    .limit(1);
  if (!docStatuts) {
    throw new Error('[demo-seed] Missing document type "RNE/statuts". Run `pnpm db:seed` first.');
  }

  const [template] = await db
    .select()
    .from(procedureTemplates)
    .where(
      and(eq(procedureTemplates.agencyId, "RNE"), eq(procedureTemplates.code, "changement_gerant")),
    )
    .limit(1);
  if (!template) {
    throw new Error(
      '[demo-seed] Missing procedure template "RNE/changement_gerant". Run `pnpm db:seed` first.',
    );
  }

  const steps = await db
    .select()
    .from(procedureSteps)
    .where(eq(procedureSteps.templateId, template.id))
    .orderBy(procedureSteps.position);
  if (steps.length === 0) {
    throw new Error('[demo-seed] Template "RNE/changement_gerant" has no steps.');
  }

  const [monthly] = await db
    .select()
    .from(obligations)
    .where(
      and(eq(obligations.agencyId, "DGI"), eq(obligations.code, "declaration_fiscale_mensuelle")),
    )
    .limit(1);
  if (!monthly) {
    throw new Error(
      '[demo-seed] Missing obligation "DGI/declaration_fiscale_mensuelle". Run `pnpm db:seed` first.',
    );
  }

  return {
    rneAgencyId: rne.id,
    dgiAgencyId: dgi.id,
    docTypeExtractId: docExtract.id,
    docTypeStatutsId: docStatuts.id,
    templateId: template.id,
    steps,
    monthlyObligationId: monthly.id,
  };
}

async function count(query: SQL): Promise<number> {
  const rows = (await db.execute(query)) as Array<{ count: number | string }>;
  return Number(rows[0]?.count ?? 0);
}

async function seedDemo(): Promise<void> {
  const catalog = await loadCatalog();

  const existingUser = (await db.execute(
    sql`select id from auth.users where id = ${userId}`,
  )) as Array<{ id: string }>;
  if (existingUser.length === 0) {
    throw new Error(`[demo-seed] auth.users has no user "${userId}".`);
  }

  // profiles ------------------------------------------------------------------
  const onboardingAnswers: OnboardingAnswers | null = isSelfServe
    ? {
        choice: role === "accountant" ? "accountant" : "has_company",
        consent: {
          policyVersion: "1.0",
          agreed: true,
          agreedAt: T.profileConsent.toISOString(),
        },
        accountType: role,
        completedAt: T.profileCompleted.toISOString(),
      }
    : null;

  await db
    .insert(profiles)
    .values({
      userId,
      accountType: role,
      displayName: isSelfServe ? "Amel Ben Salah" : "Agent RNE",
      locale: "fr",
      phone: isSelfServe ? "+216 20 123 456" : null,
      onboardingAnswers,
      termsAcceptedAt: isSelfServe ? T.profileConsent : null,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        accountType: sql`excluded.account_type`,
        displayName: sql`excluded.display_name`,
        locale: sql`excluded.locale`,
        phone: sql`excluded.phone`,
        onboardingAnswers: sql`excluded.onboarding_answers`,
        termsAcceptedAt: sql`excluded.terms_accepted_at`,
      },
    });

  // persons -------------------------------------------------------------------
  for (const person of PERSONS) {
    await db
      .insert(persons)
      .values({
        id: id(person.key),
        userId: person.key === "person_amel" && role === "owner" ? userId : null,
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: person.fullName,
        fullNameAr: person.fullNameAr,
        nationalId: person.nationalId,
        nationality: person.nationality,
        birthDate: person.birthDate,
        gender: person.gender,
        phone: person.phone,
        createdAt: T.personCreated,
        updatedAt: T.personCreated,
      })
      .onConflictDoUpdate({
        target: persons.id,
        set: {
          userId: sql`excluded.user_id`,
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          fullName: sql`excluded.full_name`,
          fullNameAr: sql`excluded.full_name_ar`,
          nationalId: sql`excluded.national_id`,
          nationality: sql`excluded.nationality`,
          birthDate: sql`excluded.birth_date`,
          gender: sql`excluded.gender`,
          phone: sql`excluded.phone`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  // companies -----------------------------------------------------------------
  for (const company of [COMPANY_IMPERIAL, COMPANY_CARTHAGE]) {
    const isImperial = company.key === "company_imperial";
    const companyId = isImperial ? ID.companyImperial : ID.companyCarthage;
    await db
      .insert(companies)
      .values({
        id: companyId,
        uniqueIdentifier: company.uniqueIdentifier,
        internalManagementNumber: company.internalManagementNumber,
        registryType: "societe",
        legalName: company.legalName,
        legalNameAr: company.legalNameAr,
        tradeName: company.tradeName,
        brandName: company.brandName,
        legalForm: company.legalForm,
        capitalAmount: company.capitalAmount,
        currency: company.currency,
        durationYears: company.durationYears,
        publicationDate: company.publicationDate,
        headquartersAddress: company.headquartersAddress,
        activityAddress: company.activityAddress,
        mainActivityLabel: company.mainActivityLabel,
        mainActivityLabelAr: company.mainActivityLabelAr,
        mainActivityCode: company.mainActivityCode,
        activityStartDate: company.activityStartDate,
        registryState: "actif",
        secondaryEstablishmentsCount: 0,
        leasing: false,
        hasPledge: false,
        fiscalDefault: "none",
        mentionDate: company.publicationDate,
        lastModificationDate: company.publicationDate,
        lastFinancialStatementsDate: null,
        lastBeneficialDeclarationDate: isImperial ? "2025-06-10" : "2024-04-01",
        workforce: company.workforce,
        taxId: company.taxId,
        status: "active",
        createdByUserId: isImperial && role === "owner" ? userId : null,
        deletedAt: null,
        createdAt: isImperial ? T.companyCreated : T.carthageCreated,
        updatedAt: isImperial ? T.companyCreated : T.carthageCreated,
      })
      .onConflictDoUpdate({
        target: companies.id,
        set: {
          uniqueIdentifier: sql`excluded.unique_identifier`,
          internalManagementNumber: sql`excluded.internal_management_number`,
          registryType: sql`excluded.registry_type`,
          legalName: sql`excluded.legal_name`,
          legalNameAr: sql`excluded.legal_name_ar`,
          tradeName: sql`excluded.trade_name`,
          brandName: sql`excluded.brand_name`,
          legalForm: sql`excluded.legal_form`,
          capitalAmount: sql`excluded.capital_amount`,
          currency: sql`excluded.currency`,
          durationYears: sql`excluded.duration_years`,
          publicationDate: sql`excluded.publication_date`,
          headquartersAddress: sql`excluded.headquarters_address`,
          activityAddress: sql`excluded.activity_address`,
          mainActivityLabel: sql`excluded.main_activity_label`,
          mainActivityLabelAr: sql`excluded.main_activity_label_ar`,
          mainActivityCode: sql`excluded.main_activity_code`,
          activityStartDate: sql`excluded.activity_start_date`,
          registryState: sql`excluded.registry_state`,
          secondaryEstablishmentsCount: sql`excluded.secondary_establishments_count`,
          leasing: sql`excluded.leasing`,
          hasPledge: sql`excluded.has_pledge`,
          fiscalDefault: sql`excluded.fiscal_default`,
          mentionDate: sql`excluded.mention_date`,
          lastModificationDate: sql`excluded.last_modification_date`,
          lastFinancialStatementsDate: sql`excluded.last_financial_statements_date`,
          lastBeneficialDeclarationDate: sql`excluded.last_beneficial_declaration_date`,
          workforce: sql`excluded.workforce`,
          taxId: sql`excluded.tax_id`,
          status: sql`excluded.status`,
          createdByUserId: sql`excluded.created_by_user_id`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  // company_persons -----------------------------------------------------------
  const companyPersonRows = [
    {
      id: ID.companyPersonImperialOwner,
      companyId: ID.companyImperial,
      personId: ID.personAmel,
      role: "owner" as const,
      roleLabelRaw: "Associée unique",
      ownershipPercent: "100.00",
      startDate: "2025-05-15",
    },
    {
      id: ID.companyPersonImperialManager,
      companyId: ID.companyImperial,
      personId: ID.personAhmed,
      role: "manager" as const,
      roleLabelRaw: "Gérant",
      ownershipPercent: null,
      startDate: "2025-05-30",
    },
    {
      id: ID.companyPersonCarthageManager,
      companyId: ID.companyCarthage,
      personId: ID.personSonia,
      role: "manager" as const,
      roleLabelRaw: "Gérante",
      ownershipPercent: null,
      startDate: "2024-03-01",
    },
  ];
  for (const row of companyPersonRows) {
    await db
      .insert(companyPersons)
      .values({
        ...row,
        endDate: null,
        addedBy: userId,
        addedAt: T.companyCreated,
        updatedAt: T.companyCreated,
      })
      .onConflictDoUpdate({
        target: companyPersons.id,
        set: {
          companyId: sql`excluded.company_id`,
          personId: sql`excluded.person_id`,
          role: sql`excluded.role`,
          roleLabelRaw: sql`excluded.role_label_raw`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          ownershipPercent: sql`excluded.ownership_percent`,
          addedBy: sql`excluded.added_by`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  // company_access_grants -----------------------------------------------------
  const desiredGrants: Array<{
    companyId: string;
    role: "owner" | "accountant";
    scopes: string[];
  }> =
    role === "owner"
      ? [{ companyId: ID.companyImperial, role: "owner", scopes: OWNER_SCOPES }]
      : role === "accountant"
        ? CLIENT_COMPANIES.map((companyId) => ({
            companyId,
            role: "accountant" as const,
            scopes: ACCOUNTANT_SCOPES,
          }))
        : [];

  if (desiredGrants.length === 0) {
    await db.delete(companyAccessGrants).where(eq(companyAccessGrants.userId, userId));
  } else {
    await db.delete(companyAccessGrants).where(
      and(
        eq(companyAccessGrants.userId, userId),
        notInArray(
          companyAccessGrants.companyId,
          desiredGrants.map((grant) => grant.companyId),
        ),
      ),
    );

    for (const grant of desiredGrants) {
      await db
        .insert(companyAccessGrants)
        .values({
          companyId: grant.companyId,
          userId,
          role: grant.role,
          scopes: grant.scopes,
          status: "active",
          grantedBy: userId,
          grantedAt: T.grant,
          expiresAt: null,
          revokedAt: null,
          createdAt: T.grant,
          updatedAt: T.grant,
        })
        .onConflictDoUpdate({
          target: [companyAccessGrants.companyId, companyAccessGrants.userId],
          set: {
            role: sql`excluded.role`,
            scopes: sql`excluded.scopes`,
            status: sql`excluded.status`,
            grantedBy: sql`excluded.granted_by`,
            grantedAt: sql`excluded.granted_at`,
            expiresAt: sql`excluded.expires_at`,
            revokedAt: sql`excluded.revoked_at`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }
  }

  // case ----------------------------------------------------------------------
  const stepByPosition = new Map(catalog.steps.map((step) => [step.position, step]));
  const step2 = stepByPosition.get(2);
  if (!step2) {
    throw new Error("[demo-seed] Expected a second step on template RNE/changement_gerant.");
  }

  await db
    .insert(cases)
    .values({
      id: ID.caseChangeManager,
      templateId: catalog.templateId,
      companyId: ID.companyImperial,
      applicantPersonId: ID.personAmel,
      createdByUserId: userId,
      assignedToUserId: userId,
      title: "Changement de gérant — IMPERIAL INTELLIGENCE TECHNOLOGIES",
      status: "in_progress",
      context: {
        templateCode: "changement_gerant",
        companyLegalName: COMPANY_IMPERIAL.legalName,
        companyUniqueIdentifier: COMPANY_IMPERIAL.uniqueIdentifier,
        newManager: "Ahmed El Makchar",
      },
      completedAt: null,
      createdAt: T.caseCreated,
      updatedAt: T.caseUpdated,
    })
    .onConflictDoUpdate({
      target: cases.id,
      set: {
        templateId: sql`excluded.template_id`,
        companyId: sql`excluded.company_id`,
        applicantPersonId: sql`excluded.applicant_person_id`,
        createdByUserId: sql`excluded.created_by_user_id`,
        assignedToUserId: sql`excluded.assigned_to_user_id`,
        title: sql`excluded.title`,
        status: sql`excluded.status`,
        context: sql`excluded.context`,
        completedAt: sql`excluded.completed_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  // case_steps ----------------------------------------------------------------
  const stepStatusByPosition: Record<number, "locked" | "available" | "in_progress" | "completed"> =
    {
      1: "completed",
      2: "in_progress",
      3: "in_progress",
      4: "locked",
      5: "locked",
      6: "locked",
      7: "locked",
      8: "locked",
    };
  const caseStepIdByPosition = new Map<number, string>();
  const startedAtByPosition: Record<number, Date> = {
    1: T.step1Started,
    2: T.step2Started,
    3: T.step3Started,
  };

  for (const step of catalog.steps) {
    const caseStepId = id(`case_step_${step.position}`);
    caseStepIdByPosition.set(step.position, caseStepId);
    const status = stepStatusByPosition[step.position] ?? "locked";
    await db
      .insert(caseSteps)
      .values({
        id: caseStepId,
        caseId: ID.caseChangeManager,
        templateStepId: step.id,
        position: step.position,
        status,
        startedAt: startedAtByPosition[step.position] ?? null,
        completedAt: step.position === 1 ? T.step1Done : null,
        assignedToUserId: userId,
        createdAt: T.caseCreated,
        updatedAt: T.caseUpdated,
      })
      .onConflictDoUpdate({
        target: caseSteps.id,
        set: {
          caseId: sql`excluded.case_id`,
          templateStepId: sql`excluded.template_step_id`,
          position: sql`excluded.position`,
          status: sql`excluded.status`,
          startedAt: sql`excluded.started_at`,
          completedAt: sql`excluded.completed_at`,
          assignedToUserId: sql`excluded.assigned_to_user_id`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  // client case ---------------------------------------------------------------
  await db
    .insert(cases)
    .values({
      id: ID.caseCarthageChangeManager,
      templateId: catalog.templateId,
      companyId: ID.companyCarthage,
      applicantPersonId: ID.personSonia,
      createdByUserId: userId,
      assignedToUserId: userId,
      title: "Changement de gérant — CARTHAGE E-COMMERCE SARL",
      status: "in_progress",
      context: {
        templateCode: "changement_gerant",
        companyLegalName: COMPANY_CARTHAGE.legalName,
        companyUniqueIdentifier: COMPANY_CARTHAGE.uniqueIdentifier,
        newManager: "Nadia Ben Youssef",
      },
      completedAt: null,
      createdAt: T.clientCaseCreated,
      updatedAt: T.clientCaseUpdated,
    })
    .onConflictDoUpdate({
      target: cases.id,
      set: {
        templateId: sql`excluded.template_id`,
        companyId: sql`excluded.company_id`,
        applicantPersonId: sql`excluded.applicant_person_id`,
        createdByUserId: sql`excluded.created_by_user_id`,
        assignedToUserId: sql`excluded.assigned_to_user_id`,
        title: sql`excluded.title`,
        status: sql`excluded.status`,
        context: sql`excluded.context`,
        completedAt: sql`excluded.completed_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  for (const step of catalog.steps) {
    const status = stepStatusByPosition[step.position] ?? "locked";
    await db
      .insert(caseSteps)
      .values({
        id: id(`case_step_carthage_${step.position}`),
        caseId: ID.caseCarthageChangeManager,
        templateStepId: step.id,
        position: step.position,
        status,
        startedAt: null,
        completedAt: null,
        assignedToUserId: userId,
        createdAt: T.clientCaseCreated,
        updatedAt: T.clientCaseUpdated,
      })
      .onConflictDoUpdate({
        target: caseSteps.id,
        set: {
          caseId: sql`excluded.case_id`,
          templateStepId: sql`excluded.template_step_id`,
          position: sql`excluded.position`,
          status: sql`excluded.status`,
          startedAt: sql`excluded.started_at`,
          completedAt: sql`excluded.completed_at`,
          assignedToUserId: sql`excluded.assigned_to_user_id`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  // documents + versions + links ----------------------------------------------
  await db
    .insert(documents)
    .values([
      {
        id: ID.docExtract,
        companyId: ID.companyImperial,
        caseId: null,
        documentTypeId: catalog.docTypeExtractId,
        ownerUserId: userId,
        title: "Extrait RNE — IMPERIAL INTELLIGENCE TECHNOLOGIES",
        description: "Extrait du registre national des entreprises (édition 2025-06-02).",
        status: "verified",
        currentVersionId: null,
        deletedAt: null,
        createdAt: T.doc1Uploaded,
        updatedAt: T.doc1Uploaded,
      },
      {
        id: ID.docStatuts,
        companyId: ID.companyImperial,
        caseId: ID.caseChangeManager,
        documentTypeId: catalog.docTypeStatutsId,
        ownerUserId: userId,
        title: "Statuts — IMPERIAL INTELLIGENCE TECHNOLOGIES",
        description: "Statuts de la société générés et signés.",
        status: "verified",
        currentVersionId: null,
        deletedAt: null,
        createdAt: T.doc2Uploaded,
        updatedAt: T.doc2Uploaded,
      },
      {
        id: ID.carthageDocExtract,
        companyId: ID.companyCarthage,
        caseId: null,
        documentTypeId: catalog.docTypeExtractId,
        ownerUserId: userId,
        title: "Extrait RNE — CARTHAGE E-COMMERCE SARL",
        description: "Extrait du registre national des entreprises (édition 2024-03-12).",
        status: "verified",
        currentVersionId: null,
        deletedAt: null,
        createdAt: T.clientDocUploaded,
        updatedAt: T.clientDocUploaded,
      },
      {
        id: ID.carthageDocStatuts,
        companyId: ID.companyCarthage,
        caseId: ID.caseCarthageChangeManager,
        documentTypeId: catalog.docTypeStatutsId,
        ownerUserId: userId,
        title: "Statuts — CARTHAGE E-COMMERCE SARL",
        description: "Statuts de la société CARTHAGE E-COMMERCE SARL.",
        status: "verified",
        currentVersionId: null,
        deletedAt: null,
        createdAt: T.clientDocUploaded,
        updatedAt: T.clientDocUploaded,
      },
    ])
    .onConflictDoUpdate({
      target: documents.id,
      set: {
        companyId: sql`excluded.company_id`,
        caseId: sql`excluded.case_id`,
        documentTypeId: sql`excluded.document_type_id`,
        ownerUserId: sql`excluded.owner_user_id`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        status: sql`excluded.status`,
        currentVersionId: sql`excluded.current_version_id`,
        deletedAt: sql`excluded.deleted_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  await db
    .insert(documentVersions)
    .values([
      {
        id: ID.versionExtract,
        documentId: ID.docExtract,
        version: 1,
        storageBucket: "nationa-documents",
        storagePath: "seed/demo/imperial/rne-extrait-2025-06-02.pdf",
        fileName: "Extrait_RNE_IMPERIAL_2025-06-02.pdf",
        mimeType: "application/pdf",
        size: 245760,
        hash: "sha256:demo-rne-extrait-imperial",
        pageCount: 2,
        source: "upload",
        uploadedByUserId: userId,
        uploadedAt: T.doc1Uploaded,
        supersedesVersionId: null,
      },
      {
        id: ID.versionStatuts,
        documentId: ID.docStatuts,
        version: 1,
        storageBucket: "nationa-documents",
        storagePath: "seed/demo/imperial/statuts-2025-05-15.pdf",
        fileName: "Statuts_IMPERIAL_2025-05-15.pdf",
        mimeType: "application/pdf",
        size: 512000,
        hash: "sha256:demo-statuts-imperial",
        pageCount: 12,
        source: "generated",
        uploadedByUserId: userId,
        uploadedAt: T.doc2Uploaded,
        supersedesVersionId: null,
      },
      {
        id: ID.carthageVersionExtract,
        documentId: ID.carthageDocExtract,
        version: 1,
        storageBucket: "nationa-documents",
        storagePath: "seed/demo/carthage/rne-extrait-2024-03-12.pdf",
        fileName: "Extrait_RNE_CARTHAGE_2024-03-12.pdf",
        mimeType: "application/pdf",
        size: 198656,
        hash: "sha256:demo-rne-extrait-carthage",
        pageCount: 2,
        source: "upload",
        uploadedByUserId: userId,
        uploadedAt: T.clientDocUploaded,
        supersedesVersionId: null,
      },
      {
        id: ID.carthageVersionStatuts,
        documentId: ID.carthageDocStatuts,
        version: 1,
        storageBucket: "nationa-documents",
        storagePath: "seed/demo/carthage/statuts-2024-03-01.pdf",
        fileName: "Statuts_CARTHAGE_2024-03-01.pdf",
        mimeType: "application/pdf",
        size: 384000,
        hash: "sha256:demo-statuts-carthage",
        pageCount: 9,
        source: "upload",
        uploadedByUserId: userId,
        uploadedAt: T.clientDocUploaded,
        supersedesVersionId: null,
      },
    ])
    .onConflictDoUpdate({
      target: documentVersions.id,
      set: {
        documentId: sql`excluded.document_id`,
        version: sql`excluded.version`,
        storageBucket: sql`excluded.storage_bucket`,
        storagePath: sql`excluded.storage_path`,
        fileName: sql`excluded.file_name`,
        mimeType: sql`excluded.mime_type`,
        size: sql`excluded.size`,
        hash: sql`excluded.hash`,
        pageCount: sql`excluded.page_count`,
        source: sql`excluded.source`,
        uploadedByUserId: sql`excluded.uploaded_by_user_id`,
        uploadedAt: sql`excluded.uploaded_at`,
        supersedesVersionId: sql`excluded.supersedes_version_id`,
      },
    });

  await db
    .update(documents)
    .set({ currentVersionId: ID.versionExtract, updatedAt: T.doc1Uploaded })
    .where(eq(documents.id, ID.docExtract));
  await db
    .update(documents)
    .set({ currentVersionId: ID.versionStatuts, updatedAt: T.doc2Uploaded })
    .where(eq(documents.id, ID.docStatuts));
  await db
    .update(documents)
    .set({ currentVersionId: ID.carthageVersionExtract, updatedAt: T.clientDocUploaded })
    .where(eq(documents.id, ID.carthageDocExtract));
  await db
    .update(documents)
    .set({ currentVersionId: ID.carthageVersionStatuts, updatedAt: T.clientDocUploaded })
    .where(eq(documents.id, ID.carthageDocStatuts));

  await db
    .insert(documentLinks)
    .values([
      {
        documentId: ID.docExtract,
        linkType: "company",
        linkId: ID.companyImperial,
        addedBy: userId,
        addedAt: T.doc1Uploaded,
      },
      {
        documentId: ID.docStatuts,
        linkType: "company",
        linkId: ID.companyImperial,
        addedBy: userId,
        addedAt: T.doc2Uploaded,
      },
      {
        documentId: ID.docStatuts,
        linkType: "case",
        linkId: ID.caseChangeManager,
        addedBy: userId,
        addedAt: T.doc2Uploaded,
      },
      {
        documentId: ID.carthageDocExtract,
        linkType: "company",
        linkId: ID.companyCarthage,
        addedBy: userId,
        addedAt: T.clientDocUploaded,
      },
      {
        documentId: ID.carthageDocStatuts,
        linkType: "company",
        linkId: ID.companyCarthage,
        addedBy: userId,
        addedAt: T.clientDocUploaded,
      },
      {
        documentId: ID.carthageDocStatuts,
        linkType: "case",
        linkId: ID.caseCarthageChangeManager,
        addedBy: userId,
        addedAt: T.clientDocUploaded,
      },
    ])
    .onConflictDoNothing();

  // case_field_values + field_provenance --------------------------------------
  const fieldRows = [
    {
      key: "legalName",
      fieldKey: "legalName",
      valueText: COMPANY_IMPERIAL.legalName,
      sourceKind: "document" as const,
      stepPosition: 1,
      documentVersionId: ID.versionExtract,
      confidence: "0.98",
    },
    {
      key: "main_activity",
      fieldKey: "mainActivityLabel",
      valueText: COMPANY_IMPERIAL.mainActivityLabel,
      sourceKind: "document" as const,
      stepPosition: 1,
      documentVersionId: ID.versionExtract,
      confidence: "0.94",
    },
    {
      key: "manager_full_name",
      fieldKey: "managerFullName",
      valueText: "Ahmed El Makchar",
      sourceKind: "user" as const,
      stepPosition: 3,
      documentVersionId: null,
      confidence: null,
    },
    {
      key: "manager_national_id",
      fieldKey: "managerNationalId",
      valueText: "08765432",
      sourceKind: "ai" as const,
      stepPosition: 3,
      documentVersionId: null,
      confidence: "0.82",
    },
    {
      key: "decision_date",
      fieldKey: "decisionDate",
      valueText: "2026-06-10",
      sourceKind: "user" as const,
      stepPosition: 1,
      documentVersionId: null,
      confidence: null,
    },
  ];

  for (const field of fieldRows) {
    await db
      .insert(caseFieldValues)
      .values({
        id: id(`case_field_${field.key}`),
        caseId: ID.caseChangeManager,
        stepId: caseStepIdByPosition.get(field.stepPosition) ?? null,
        fieldKey: field.fieldKey,
        valueText: field.valueText,
        valueJsonb: null,
        sourceKind: field.sourceKind,
        sourceDocumentVersionId: field.documentVersionId,
        extractionFieldId: null,
        aiProposalId: null,
        confidence: field.confidence,
        enteredByUserId: field.sourceKind === "user" ? userId : null,
        createdAt: T.step2Started,
        updatedAt: T.step2Started,
      })
      .onConflictDoUpdate({
        target: caseFieldValues.id,
        set: {
          caseId: sql`excluded.case_id`,
          stepId: sql`excluded.step_id`,
          fieldKey: sql`excluded.field_key`,
          valueText: sql`excluded.value_text`,
          valueJsonb: sql`excluded.value_jsonb`,
          sourceKind: sql`excluded.source_kind`,
          sourceDocumentVersionId: sql`excluded.source_document_version_id`,
          extractionFieldId: sql`excluded.extraction_field_id`,
          aiProposalId: sql`excluded.ai_proposal_id`,
          confidence: sql`excluded.confidence`,
          enteredByUserId: sql`excluded.entered_by_user_id`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  const storedFields = await db
    .select()
    .from(caseFieldValues)
    .where(eq(caseFieldValues.caseId, ID.caseChangeManager));
  const storedFieldByKey = new Map(storedFields.map((field) => [field.fieldKey, field]));

  for (const field of fieldRows) {
    const stored = storedFieldByKey.get(field.fieldKey);
    if (!stored) {
      continue;
    }
    await db
      .insert(fieldProvenance)
      .values({
        id: id(`provenance_${field.key}`),
        subjectType: "case_field",
        subjectId: stored.id,
        fieldKey: field.fieldKey,
        sourceKind: field.sourceKind,
        sourceDocumentVersionId: field.documentVersionId,
        extractionFieldId: null,
        aiProposalId: null,
        confidence: field.confidence,
        enteredByUserId: field.sourceKind === "user" ? userId : null,
        createdAt: T.step2Started,
      })
      .onConflictDoUpdate({
        target: fieldProvenance.id,
        set: {
          subjectType: sql`excluded.subject_type`,
          subjectId: sql`excluded.subject_id`,
          fieldKey: sql`excluded.field_key`,
          sourceKind: sql`excluded.source_kind`,
          sourceDocumentVersionId: sql`excluded.source_document_version_id`,
          extractionFieldId: sql`excluded.extraction_field_id`,
          aiProposalId: sql`excluded.ai_proposal_id`,
          confidence: sql`excluded.confidence`,
          enteredByUserId: sql`excluded.entered_by_user_id`,
        },
      });
  }

  // company_registry_snapshots ------------------------------------------------
  await db
    .insert(companyRegistrySnapshots)
    .values({
      id: ID.snapshotImperial,
      companyId: ID.companyImperial,
      documentVersionId: ID.versionExtract,
      extractNumber: "B02188712025",
      editionDate: "2025-06-02",
      verificationNumber: "RNE-2025-0218871",
      registryState: "actif",
      snapshot: {
        uniqueIdentifier: COMPANY_IMPERIAL.uniqueIdentifier,
        internalManagementNumber: COMPANY_IMPERIAL.internalManagementNumber,
        legalName: COMPANY_IMPERIAL.legalName,
        legalNameAr: COMPANY_IMPERIAL.legalNameAr,
        legalForm: COMPANY_IMPERIAL.legalForm,
        capitalAmount: COMPANY_IMPERIAL.capitalAmount,
        currency: COMPANY_IMPERIAL.currency,
        headquartersAddress: COMPANY_IMPERIAL.headquartersAddress,
        mainActivityCode: COMPANY_IMPERIAL.mainActivityCode,
        mainActivityLabel: COMPANY_IMPERIAL.mainActivityLabel,
        publicationDate: COMPANY_IMPERIAL.publicationDate,
        registryState: "actif",
        extractNumber: "B02188712025",
        verificationNumber: "RNE-2025-0218871",
        managers: [
          {
            fullName: "Ahmed El Makchar",
            fullNameAr: "أحمد المكشر",
            role: "manager",
            startDate: "2025-05-30",
          },
        ],
      },
      createdAt: T.snapshot,
    })
    .onConflictDoUpdate({
      target: companyRegistrySnapshots.id,
      set: {
        companyId: sql`excluded.company_id`,
        documentVersionId: sql`excluded.document_version_id`,
        extractNumber: sql`excluded.extract_number`,
        editionDate: sql`excluded.edition_date`,
        verificationNumber: sql`excluded.verification_number`,
        registryState: sql`excluded.registry_state`,
        snapshot: sql`excluded.snapshot`,
      },
    });

  // check_runs + findings + finding_notes -------------------------------------
  await db
    .insert(checkRuns)
    .values({
      id: ID.checkRun,
      subjectType: "case",
      subjectId: ID.caseChangeManager,
      ruleSetVersion: "1.0.0",
      status: "failed",
      summary: {
        ruleSetVersion: "1.0.0",
        findingsCount: 3,
        bySeverity: { blocker: 1, warning: 1, error: 1 },
        blockingCount: 1,
      },
      startedAt: T.checkRun,
      completedAt: T.checkRun,
      createdAt: T.checkRun,
    })
    .onConflictDoUpdate({
      target: checkRuns.id,
      set: {
        subjectType: sql`excluded.subject_type`,
        subjectId: sql`excluded.subject_id`,
        ruleSetVersion: sql`excluded.rule_set_version`,
        status: sql`excluded.status`,
        summary: sql`excluded.summary`,
        startedAt: sql`excluded.started_at`,
        completedAt: sql`excluded.completed_at`,
      },
    });

  const findingRows = [
    {
      id: ID.findingRequiredDoc,
      severity: "blocker" as const,
      code: "required_document_missing",
      title: "Pièce requise manquante : Procès-verbal de nomination du gérant",
      messagePlain:
        "La pièce « Procès-verbal de nomination du gérant » est exigée par la procédure, mais aucun document correspondant n'a été déposé.",
      suggestedFix:
        "Téléversez la pièce « Procès-verbal de nomination du gérant » dans le dossier avant de le soumettre.",
      comparedRefs: {
        refs: [
          {
            kind: "db",
            source: "procedure_steps",
            field: "requiredDocumentTypeId",
            labelKey: "checks.fields.documentType",
            ref: step2.id,
            value: "Procès-verbal de nomination du gérant",
          },
          {
            kind: "derived",
            source: "documents",
            field: "documentTypeId",
            labelKey: "checks.fields.presentDocuments",
            value: null,
          },
        ],
        params: {
          documentType: "Procès-verbal de nomination du gérant",
          documentTypeCode: "pv_nomination_gerant",
        },
      },
    },
    {
      id: ID.findingNameMismatch,
      severity: "warning" as const,
      code: "company_name_mismatch",
      title: "Divergence de dénomination sociale",
      messagePlain:
        "La dénomination sociale enregistrée (« IMPERIAL INTELLIGENCE TECHNOLOGIES ») diffère de la valeur extraite (« IMPERIAL INTELLIGENCE TECHNOLOGIE »).",
      suggestedFix:
        "Vérifiez la dénomination sociale et mettez à jour la fiche entreprise ou corrigez l'extraction.",
      comparedRefs: {
        refs: [
          {
            kind: "db",
            source: "companies",
            field: "legalName",
            labelKey: "checks.fields.legalName",
            ref: ID.companyImperial,
            value: COMPANY_IMPERIAL.legalName,
          },
          {
            kind: "extracted",
            source: "ocr",
            field: "legalName",
            labelKey: "checks.fields.legalName",
            ref: ID.versionExtract,
            documentVersionId: ID.versionExtract,
            value: "IMPERIAL INTELLIGENCE TECHNOLOGIE",
          },
        ],
        params: {
          expected: COMPANY_IMPERIAL.legalName,
          actual: "IMPERIAL INTELLIGENCE TECHNOLOGIE",
        },
      },
    },
    {
      id: ID.findingCapital,
      severity: "error" as const,
      code: "capital_mismatch",
      title: "Divergence du capital social",
      messagePlain:
        "Le capital enregistré (« 1000.000 ») diffère de la valeur extraite (« 1000.500 »).",
      suggestedFix:
        "Vérifiez le montant du capital et mettez à jour la fiche entreprise ou corrigez l'extraction.",
      comparedRefs: {
        refs: [
          {
            kind: "db",
            source: "companies",
            field: "capitalAmount",
            labelKey: "checks.fields.capitalAmount",
            ref: ID.companyImperial,
            value: COMPANY_IMPERIAL.capitalAmount,
          },
          {
            kind: "extracted",
            source: "ocr",
            field: "capitalAmount",
            labelKey: "checks.fields.capitalAmount",
            ref: ID.versionExtract,
            documentVersionId: ID.versionExtract,
            value: "1000.500",
          },
        ],
        params: { expected: COMPANY_IMPERIAL.capitalAmount, actual: "1000.500" },
      },
    },
  ];

  for (const finding of findingRows) {
    await db
      .insert(findings)
      .values({
        id: finding.id,
        checkRunId: ID.checkRun,
        severity: finding.severity,
        code: finding.code,
        title: finding.title,
        messagePlain: finding.messagePlain,
        comparedRefs: finding.comparedRefs,
        suggestedFix: finding.suggestedFix,
        status: "open",
        resolvedAt: null,
        resolvedByUserId: null,
        createdAt: T.checkRun,
        updatedAt: T.checkRun,
      })
      .onConflictDoUpdate({
        target: findings.id,
        set: {
          checkRunId: sql`excluded.check_run_id`,
          severity: sql`excluded.severity`,
          code: sql`excluded.code`,
          title: sql`excluded.title`,
          messagePlain: sql`excluded.message_plain`,
          comparedRefs: sql`excluded.compared_refs`,
          suggestedFix: sql`excluded.suggested_fix`,
          status: sql`excluded.status`,
          resolvedAt: sql`excluded.resolved_at`,
          resolvedByUserId: sql`excluded.resolved_by_user_id`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  await db
    .insert(findingNotes)
    .values([
      {
        id: ID.findingNoteBlocker,
        findingId: ID.findingRequiredDoc,
        userId,
        kind: "explanation",
        body: "Le procès-verbal de nomination du gérant n'a pas encore été téléversé. Le dossier ne peut pas être soumis au RNE tant que cette pièce manque.",
        createdAt: T.checkRun,
      },
      {
        id: ID.findingNoteName,
        findingId: ID.findingNameMismatch,
        userId,
        kind: "note",
        body: "Écart d'une lettre détecté lors de l'OCR de l'extrait RNE. À confirmer avec le registre.",
        createdAt: T.checkRun,
      },
    ])
    .onConflictDoUpdate({
      target: findingNotes.id,
      set: {
        findingId: sql`excluded.finding_id`,
        userId: sql`excluded.user_id`,
        kind: sql`excluded.kind`,
        body: sql`excluded.body`,
      },
    });

  // submissions + submission_documents + reviews ------------------------------
  const inReviewSnapshot = {
    generatedAt: T.submissionInReview.toISOString(),
    fields: storedFields.map((field) => ({
      fieldKey: field.fieldKey,
      valueText: field.valueText,
      valueJsonb: field.valueJsonb,
      sourceKind: field.sourceKind,
      confidence: field.confidence,
    })),
    documents: [
      {
        id: ID.docExtract,
        title: "Extrait RNE — IMPERIAL INTELLIGENCE TECHNOLOGIES",
        status: "verified",
        documentTypeId: catalog.docTypeExtractId,
        currentVersionId: ID.versionExtract,
      },
      {
        id: ID.docStatuts,
        title: "Statuts — IMPERIAL INTELLIGENCE TECHNOLOGIES",
        status: "verified",
        documentTypeId: catalog.docTypeStatutsId,
        currentVersionId: ID.versionStatuts,
      },
    ],
    cleanliness: {
      score: "20.00",
      tier: "needs_review",
      penalty: 80,
      severityPenalty: 60,
      missingDocumentsPenalty: 20,
      missingDocumentCount: 1,
      counts: { info: 0, warning: 1, error: 1, blocker: 1, total: 3 },
    },
  };

  const approvedSnapshot = {
    generatedAt: T.submissionApproved.toISOString(),
    fields: [],
    documents: [
      {
        id: ID.docExtract,
        title: "Extrait RNE — IMPERIAL INTELLIGENCE TECHNOLOGIES",
        status: "verified",
        documentTypeId: catalog.docTypeExtractId,
        currentVersionId: ID.versionExtract,
      },
    ],
    cleanliness: {
      score: "100.00",
      tier: "clean",
      penalty: 0,
      severityPenalty: 0,
      missingDocumentsPenalty: 0,
      missingDocumentCount: 0,
      counts: { info: 0, warning: 0, error: 0, blocker: 0, total: 0 },
    },
  };

  await db
    .insert(submissions)
    .values([
      {
        id: ID.submissionInReview,
        caseId: ID.caseChangeManager,
        companyId: ID.companyImperial,
        agencyId: catalog.rneAgencyId,
        submittedByUserId: userId,
        status: "in_review",
        snapshot: inReviewSnapshot,
        cleanlinessTier: "needs_review",
        cleanlinessScore: "20.00",
        submittedAt: T.submissionInReview,
        decidedAt: null,
        deletedAt: null,
        createdAt: T.submissionInReview,
        updatedAt: T.submissionInReview,
      },
      {
        id: ID.submissionApproved,
        caseId: null,
        companyId: ID.companyImperial,
        agencyId: catalog.rneAgencyId,
        submittedByUserId: userId,
        status: "approved",
        snapshot: approvedSnapshot,
        cleanlinessTier: "clean",
        cleanlinessScore: "100.00",
        submittedAt: T.submissionApproved,
        decidedAt: T.reviewApproved,
        deletedAt: null,
        createdAt: T.submissionApproved,
        updatedAt: T.reviewApproved,
      },
      {
        id: ID.submissionDgiQueued,
        caseId: null,
        companyId: ID.companyCarthage,
        agencyId: catalog.dgiAgencyId,
        submittedByUserId: userId,
        status: "queued",
        snapshot: {
          generatedAt: T.submissionDgi.toISOString(),
          fields: [],
          documents: [
            {
              id: ID.carthageDocExtract,
              title: "Extrait RNE — CARTHAGE E-COMMERCE SARL",
              status: "verified",
              documentTypeId: catalog.docTypeExtractId,
              currentVersionId: ID.carthageVersionExtract,
            },
          ],
          cleanliness: {
            score: "75.00",
            tier: "minor_concern",
            penalty: 25,
            severityPenalty: 0,
            missingDocumentsPenalty: 25,
            missingDocumentCount: 1,
            counts: { info: 0, warning: 0, error: 0, blocker: 0, total: 0 },
          },
        },
        cleanlinessTier: "minor_concern",
        cleanlinessScore: "75.00",
        submittedAt: T.submissionDgi,
        decidedAt: null,
        deletedAt: null,
        createdAt: T.submissionDgi,
        updatedAt: T.submissionDgi,
      },
    ])
    .onConflictDoUpdate({
      target: submissions.id,
      set: {
        caseId: sql`excluded.case_id`,
        companyId: sql`excluded.company_id`,
        agencyId: sql`excluded.agency_id`,
        submittedByUserId: sql`excluded.submitted_by_user_id`,
        status: sql`excluded.status`,
        snapshot: sql`excluded.snapshot`,
        cleanlinessTier: sql`excluded.cleanliness_tier`,
        cleanlinessScore: sql`excluded.cleanliness_score`,
        submittedAt: sql`excluded.submitted_at`,
        decidedAt: sql`excluded.decided_at`,
        deletedAt: sql`excluded.deleted_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  await db
    .insert(submissionDocuments)
    .values([
      {
        submissionId: ID.submissionInReview,
        documentVersionId: ID.versionExtract,
        addedBy: userId,
        addedAt: T.submissionInReview,
      },
      {
        submissionId: ID.submissionInReview,
        documentVersionId: ID.versionStatuts,
        addedBy: userId,
        addedAt: T.submissionInReview,
      },
      {
        submissionId: ID.submissionApproved,
        documentVersionId: ID.versionExtract,
        addedBy: userId,
        addedAt: T.submissionApproved,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(reviews)
    .values({
      id: ID.reviewApproved,
      submissionId: ID.submissionApproved,
      officerUserId: userId,
      decision: "approve",
      reason: "Dossier complet et conforme aux exigences du RNE.",
      notes: "Vérification effectuée le 2026-05-04, pièces conformes.",
      decidedAt: T.reviewApproved,
    })
    .onConflictDoUpdate({
      target: reviews.id,
      set: {
        submissionId: sql`excluded.submission_id`,
        officerUserId: sql`excluded.officer_user_id`,
        decision: sql`excluded.decision`,
        reason: sql`excluded.reason`,
        notes: sql`excluded.notes`,
        decidedAt: sql`excluded.decided_at`,
      },
    });

  // agency_memberships --------------------------------------------------------
  const desiredMembership: { agencyId: string; role: "supervisor" | "admin" } | null =
    role === "officer" || role === "admin"
      ? { agencyId: catalog.rneAgencyId, role: agencyMembershipRole }
      : null;

  if (!desiredMembership) {
    await db.delete(agencyMemberships).where(eq(agencyMemberships.userId, userId));
  } else {
    await db
      .delete(agencyMemberships)
      .where(
        and(
          eq(agencyMemberships.userId, userId),
          notInArray(agencyMemberships.agencyId, [desiredMembership.agencyId]),
        ),
      );

    await db
      .insert(agencyMemberships)
      .values({
        agencyId: desiredMembership.agencyId,
        userId,
        role: desiredMembership.role,
        status: "active",
        addedBy: userId,
        addedAt: T.officerSince,
      })
      .onConflictDoUpdate({
        target: [agencyMemberships.agencyId, agencyMemberships.userId],
        set: {
          role: sql`excluded.role`,
          status: sql`excluded.status`,
          addedBy: sql`excluded.added_by`,
          addedAt: sql`excluded.added_at`,
        },
      });
  }

  // invoices + invoice_lines --------------------------------------------------
  const invoiceIdByKey = new Map<string, string>();
  const invoiceIdsByCompany = new Map<string, string[]>();
  for (const invoice of DEMO_INVOICES) {
    const invoiceId = id(`invoice_${invoice.key}`);
    const companyId = COMPANY_ID_BY_KEY[invoice.companyKey];
    invoiceIdByKey.set(invoice.key, invoiceId);
    const companyInvoiceIds = invoiceIdsByCompany.get(companyId) ?? [];
    companyInvoiceIds.push(invoiceId);
    invoiceIdsByCompany.set(companyId, companyInvoiceIds);
    await db
      .insert(invoices)
      .values({
        id: invoiceId,
        companyId,
        direction: invoice.direction,
        supplierName: invoice.supplierName,
        supplierTaxId: invoice.supplierTaxId,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: "TND",
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        sourceDocumentVersionId: null,
        status: "verified",
        createdAt: T.invoice,
        updatedAt: T.invoice,
      })
      .onConflictDoUpdate({
        target: invoices.id,
        set: {
          companyId: sql`excluded.company_id`,
          direction: sql`excluded.direction`,
          supplierName: sql`excluded.supplier_name`,
          supplierTaxId: sql`excluded.supplier_tax_id`,
          invoiceNumber: sql`excluded.invoice_number`,
          issueDate: sql`excluded.issue_date`,
          dueDate: sql`excluded.due_date`,
          currency: sql`excluded.currency`,
          subtotal: sql`excluded.subtotal`,
          taxAmount: sql`excluded.tax_amount`,
          total: sql`excluded.total`,
          sourceDocumentVersionId: sql`excluded.source_document_version_id`,
          status: sql`excluded.status`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    for (const [index, line] of invoice.lines.entries()) {
      await db
        .insert(invoiceLines)
        .values({
          id: id(`invoice_line_${invoice.key}_${index + 1}`),
          invoiceId,
          position: index + 1,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
          createdAt: T.invoice,
        })
        .onConflictDoUpdate({
          target: invoiceLines.id,
          set: {
            invoiceId: sql`excluded.invoice_id`,
            position: sql`excluded.position`,
            description: sql`excluded.description`,
            quantity: sql`excluded.quantity`,
            unitPrice: sql`excluded.unit_price`,
            taxRate: sql`excluded.tax_rate`,
            taxAmount: sql`excluded.tax_amount`,
            lineTotal: sql`excluded.line_total`,
          },
        });
    }
  }

  // filings + filing_invoices -------------------------------------------------
  const allInvoiceIds = [...invoiceIdByKey.values()];
  const imperialInvoiceIds = invoiceIdsByCompany.get(ID.companyImperial) ?? [];
  await db
    .insert(filings)
    .values({
      id: ID.filingDgi,
      companyId: ID.companyImperial,
      agencyId: catalog.dgiAgencyId,
      obligationId: catalog.monthlyObligationId,
      taxType: "declaration_fiscale_mensuelle",
      periodStart: "2026-04-01",
      periodEnd: "2026-05-31",
      status: "ready",
      preparedByUserId: userId,
      reviewedByUserId: null,
      totalTaxDue: "919.600",
      payload: {
        generatedAt: T.filing.toISOString(),
        obligationCode: "declaration_fiscale_mensuelle",
        totals: {
          outputBase: 8000,
          outputTax: 1520,
          inputBase: 3160,
          inputTax: 600.4,
          netTaxDue: 919.6,
          byRate: [{ rate: 19, base: 11160, tax: 2120.4 }],
          invoiceIds: imperialInvoiceIds,
          invoiceCount: imperialInvoiceIds.length,
          currency: "TND",
        },
      },
      documentId: null,
      submittedAt: null,
      createdAt: T.filing,
      updatedAt: T.filing,
    })
    .onConflictDoUpdate({
      target: filings.id,
      set: {
        companyId: sql`excluded.company_id`,
        agencyId: sql`excluded.agency_id`,
        obligationId: sql`excluded.obligation_id`,
        taxType: sql`excluded.tax_type`,
        periodStart: sql`excluded.period_start`,
        periodEnd: sql`excluded.period_end`,
        status: sql`excluded.status`,
        preparedByUserId: sql`excluded.prepared_by_user_id`,
        reviewedByUserId: sql`excluded.reviewed_by_user_id`,
        totalTaxDue: sql`excluded.total_tax_due`,
        payload: sql`excluded.payload`,
        documentId: sql`excluded.document_id`,
        submittedAt: sql`excluded.submitted_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  await db
    .insert(filingInvoices)
    .values(
      imperialInvoiceIds.map((invoiceId) => ({
        filingId: ID.filingDgi,
        invoiceId,
        addedBy: userId,
        addedAt: T.filing,
      })),
    )
    .onConflictDoNothing();

  // notifications -------------------------------------------------------------
  await db
    .insert(notifications)
    .values([
      {
        id: ID.notificationReview,
        userId,
        companyId: ID.companyImperial,
        type: "review_decision",
        title: "Dossier approuvé — RNE",
        body: "Votre soumission pour IMPERIAL INTELLIGENCE TECHNOLOGIES a été approuvée par le RNE.",
        entityType: "submission",
        entityId: ID.submissionApproved,
        readAt: null,
        createdAt: T.reviewApproved,
      },
      {
        id: ID.notificationCheck,
        userId,
        companyId: ID.companyImperial,
        type: "check_failed",
        title: "Contrôles échoués — Changement de gérant",
        body: "1 blocage et 2 anomalies détectés sur le dossier de changement de gérant.",
        entityType: "check_run",
        entityId: ID.checkRun,
        readAt: null,
        createdAt: T.checkRun,
      },
      {
        id: ID.notificationDocument,
        userId,
        companyId: ID.companyImperial,
        type: "document_processed",
        title: "Extraction terminée — Extrait RNE",
        body: "Les informations de l'extrait RNE ont été extraites avec succès.",
        entityType: "document",
        entityId: ID.docExtract,
        readAt: at("2026-06-11T11:00:00.000Z"),
        createdAt: at("2026-06-11T10:05:00.000Z"),
      },
      {
        id: ID.notificationDeadline,
        userId,
        companyId: ID.companyImperial,
        type: "deadline_reminder",
        title: "Échéance DGI — Déclaration fiscale mensuelle",
        body: "La déclaration fiscale mensuelle (TVA) doit être déposée avant le 28 juin 2026.",
        entityType: "obligation",
        entityId: catalog.monthlyObligationId,
        readAt: null,
        createdAt: at("2026-06-10T07:00:00.000Z"),
      },
    ])
    .onConflictDoUpdate({
      target: notifications.id,
      set: {
        userId: sql`excluded.user_id`,
        companyId: sql`excluded.company_id`,
        type: sql`excluded.type`,
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        entityType: sql`excluded.entity_type`,
        entityId: sql`excluded.entity_id`,
        readAt: sql`excluded.read_at`,
      },
    });

  // activity_events -----------------------------------------------------------
  await db
    .insert(activityEvents)
    .values([
      {
        id: ID.activityReview,
        companyId: ID.companyImperial,
        actorUserId: userId,
        actorType: "officer",
        entityType: "submission",
        entityId: ID.submissionApproved,
        action: "submission.approved",
        summary: "Soumission approuvée par le RNE",
        data: { decision: "approve" },
        createdAt: T.reviewApproved,
      },
      {
        id: ID.activityCheck,
        companyId: ID.companyImperial,
        actorUserId: null,
        actorType: "system",
        entityType: "check_run",
        entityId: ID.checkRun,
        action: "check.failed",
        summary: "Contrôles échoués : 1 blocage, 2 anomalies",
        data: { findingsCount: 3, blockingCount: 1 },
        createdAt: T.checkRun,
      },
      {
        id: ID.activityDocument,
        companyId: ID.companyImperial,
        actorUserId: null,
        actorType: "ai",
        entityType: "document",
        entityId: ID.docStatuts,
        action: "document.generated",
        summary: "Statuts générés pour IMPERIAL INTELLIGENCE TECHNOLOGIES",
        data: { documentType: "statuts" },
        createdAt: T.doc2Uploaded,
      },
      {
        id: ID.activityCase,
        companyId: ID.companyImperial,
        actorUserId: userId,
        actorType: "user",
        entityType: "case",
        entityId: ID.caseChangeManager,
        action: "case.created",
        summary: "Dossier de changement de gérant démarré",
        data: { templateCode: "changement_gerant" },
        createdAt: T.caseCreated,
      },
    ])
    .onConflictDoUpdate({
      target: activityEvents.id,
      set: {
        companyId: sql`excluded.company_id`,
        actorUserId: sql`excluded.actor_user_id`,
        actorType: sql`excluded.actor_type`,
        entityType: sql`excluded.entity_type`,
        entityId: sql`excluded.entity_id`,
        action: sql`excluded.action`,
        summary: sql`excluded.summary`,
        data: sql`excluded.data`,
      },
    });

  // report --------------------------------------------------------------------
  const companyIds = sql.raw(`'${ID.companyImperial}'::uuid, '${ID.companyCarthage}'::uuid`);
  const caseIds = sql.raw(
    `'${ID.caseChangeManager}'::uuid, '${ID.caseCarthageChangeManager}'::uuid`,
  );
  const submissionIds = sql.raw(
    `'${ID.submissionInReview}'::uuid, '${ID.submissionApproved}'::uuid, '${ID.submissionDgiQueued}'::uuid`,
  );
  const documentIds = sql.raw(
    `'${ID.docExtract}'::uuid, '${ID.docStatuts}'::uuid, '${ID.carthageDocExtract}'::uuid, '${ID.carthageDocStatuts}'::uuid`,
  );
  const invoiceIds = sql.raw(allInvoiceIds.map((value) => `'${value}'::uuid`).join(", "));
  const notificationIds = sql.raw(
    [ID.notificationReview, ID.notificationCheck, ID.notificationDocument, ID.notificationDeadline]
      .map((value) => `'${value}'::uuid`)
      .join(", "),
  );
  const activityIds = sql.raw(
    [ID.activityReview, ID.activityCheck, ID.activityDocument, ID.activityCase]
      .map((value) => `'${value}'::uuid`)
      .join(", "),
  );

  const counts = {
    profiles: await count(
      sql`select count(*)::int as count from profiles where user_id = ${userId}`,
    ),
    company_access_grants: await count(
      sql`select count(*)::int as count from company_access_grants where user_id = ${userId} and status = 'active'`,
    ),
    companies: await count(
      sql`select count(*)::int as count from companies where id in (${companyIds})`,
    ),
    persons: await count(
      sql`select count(*)::int as count from persons where id in (${sql.raw(PERSONS.map((p) => `'${id(p.key)}'::uuid`).join(", "))})`,
    ),
    company_persons: await count(
      sql`select count(*)::int as count from company_persons where company_id in (${companyIds})`,
    ),
    documents: await count(
      sql`select count(*)::int as count from documents where id in (${documentIds})`,
    ),
    document_versions: await count(
      sql`select count(*)::int as count from document_versions where document_id in (${documentIds})`,
    ),
    document_links: await count(
      sql`select count(*)::int as count from document_links where document_id in (${documentIds})`,
    ),
    company_registry_snapshots: await count(
      sql`select count(*)::int as count from company_registry_snapshots where company_id in (${companyIds})`,
    ),
    cases: await count(sql`select count(*)::int as count from cases where id in (${caseIds})`),
    case_steps: await count(
      sql`select count(*)::int as count from case_steps where case_id in (${caseIds})`,
    ),
    case_field_values: await count(
      sql`select count(*)::int as count from case_field_values where case_id in (${caseIds})`,
    ),
    field_provenance: await count(
      sql`select count(*)::int as count from field_provenance where subject_type = 'case_field' and subject_id in (select id from case_field_values where case_id in (${caseIds}))`,
    ),
    check_runs: await count(
      sql`select count(*)::int as count from check_runs where subject_type = 'case' and subject_id in (${caseIds})`,
    ),
    findings: await count(
      sql`select count(*)::int as count from findings where check_run_id = ${ID.checkRun}`,
    ),
    finding_notes: await count(
      sql`select count(*)::int as count from finding_notes where finding_id in (select id from findings where check_run_id = ${ID.checkRun})`,
    ),
    submissions: await count(
      sql`select count(*)::int as count from submissions where id in (${submissionIds})`,
    ),
    submission_documents: await count(
      sql`select count(*)::int as count from submission_documents where submission_id in (${submissionIds})`,
    ),
    reviews: await count(
      sql`select count(*)::int as count from reviews where submission_id in (${submissionIds})`,
    ),
    agency_memberships: await count(
      sql`select count(*)::int as count from agency_memberships where user_id = ${userId} and status = 'active'`,
    ),
    invoices: await count(
      sql`select count(*)::int as count from invoices where id in (${invoiceIds})`,
    ),
    invoice_lines: await count(
      sql`select count(*)::int as count from invoice_lines where invoice_id in (${invoiceIds})`,
    ),
    filings: await count(
      sql`select count(*)::int as count from filings where id = ${ID.filingDgi}`,
    ),
    filing_invoices: await count(
      sql`select count(*)::int as count from filing_invoices where filing_id = ${ID.filingDgi}`,
    ),
    notifications: await count(
      sql`select count(*)::int as count from notifications where id in (${notificationIds})`,
    ),
    activity_events: await count(
      sql`select count(*)::int as count from activity_events where id in (${activityIds})`,
    ),
  };

  const grants = await db
    .select({
      companyId: companyAccessGrants.companyId,
      role: companyAccessGrants.role,
      status: companyAccessGrants.status,
      legalName: companies.legalName,
    })
    .from(companyAccessGrants)
    .innerJoin(companies, eq(companies.id, companyAccessGrants.companyId))
    .where(eq(companyAccessGrants.userId, userId))
    .orderBy(companies.legalName);

  const memberships = await db
    .select({
      agencyId: agencyMemberships.agencyId,
      role: agencyMemberships.role,
      status: agencyMemberships.status,
      nameFr: agencies.nameFr,
    })
    .from(agencyMemberships)
    .innerJoin(agencies, eq(agencies.id, agencyMemberships.agencyId))
    .where(eq(agencyMemberships.userId, userId))
    .orderBy(agencies.nameFr);

  console.log(`[demo-seed] seeded demo workspace for user ${userId}`);
  console.log(`[demo-seed] role: ${role} (${isSelfServe ? "self-serve" : "provisioned"})`);
  console.log(
    `[demo-seed] profile: accountType=${role} onboarding=${isSelfServe ? "completed" : "provisioned"}`,
  );
  console.log(
    `[demo-seed] company grants: ${
      grants.length === 0
        ? "none"
        : grants.map((grant) => `${grant.legalName} (${grant.role}, ${grant.status})`).join(", ")
    }`,
  );
  console.log(
    `[demo-seed] agency memberships: ${
      memberships.length === 0
        ? "none"
        : memberships.map((row) => `${row.nameFr} (${row.role}, ${row.status})`).join(", ")
    }`,
  );
  console.log("[demo-seed] counts:", counts);
}

await seedDemo();

process.exit(0);

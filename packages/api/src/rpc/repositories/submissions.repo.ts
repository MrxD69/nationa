import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";

import {
  activityEvents,
  agencies,
  agencyMemberships,
  caseFieldValues,
  cases,
  companies,
  documentVersions,
  documents,
  procedureSteps,
  procedureTemplates,
  reviews,
  submissionDocuments,
  submissions,
  type NewReview,
  type NewSubmission,
  type NewSubmissionDocument,
  type Submission,
} from "@nationa/db";

import type { Db } from "../context";

export const SUBMISSION_ATTENTION_STATUSES = ["queued", "in_review", "escalated"] as const;

export async function findCaseById(db: Db, caseId: string) {
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  return row ?? null;
}

export async function findTemplateById(db: Db, templateId: string) {
  const [row] = await db
    .select()
    .from(procedureTemplates)
    .where(eq(procedureTemplates.id, templateId))
    .limit(1);
  return row ?? null;
}

export async function listRequiredStepDocumentTypeIds(db: Db, templateId: string) {
  const rows = await db
    .select({ documentTypeId: procedureSteps.requiredDocumentTypeId })
    .from(procedureSteps)
    .where(and(eq(procedureSteps.templateId, templateId), eq(procedureSteps.isOptional, false)));

  return rows
    .map((row) => row.documentTypeId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function listPresentDocumentTypeIds(
  db: Db,
  caseId: string,
  documentTypeIds: string[],
) {
  const rows = await db
    .select({ documentTypeId: documents.documentTypeId })
    .from(documents)
    .where(
      and(
        eq(documents.caseId, caseId),
        isNull(documents.deletedAt),
        inArray(documents.documentTypeId, documentTypeIds),
      ),
    );

  return rows.map((row) => row.documentTypeId).filter((id): id is string => typeof id === "string");
}

export async function listCaseFieldValues(db: Db, caseId: string) {
  return db.select().from(caseFieldValues).where(eq(caseFieldValues.caseId, caseId));
}

export async function listCaseDocuments(db: Db, caseId: string) {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.caseId, caseId), isNull(documents.deletedAt)));
}

export async function insertSubmissionDocuments(db: Db, values: NewSubmissionDocument[]) {
  if (values.length === 0) {
    return;
  }
  await db.insert(submissionDocuments).values(values).onConflictDoNothing();
}

export async function findReusableSubmission(
  db: Db,
  caseId: string,
  statuses: readonly Submission["status"][],
) {
  const [row] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.caseId, caseId),
        isNull(submissions.deletedAt),
        inArray(submissions.status, [...statuses]),
      ),
    )
    .orderBy(desc(submissions.createdAt))
    .limit(1);
  return row ?? null;
}

export async function insertSubmission(db: Db, values: NewSubmission) {
  const [row] = await db.insert(submissions).values(values).returning();
  return row ?? null;
}

export async function updateSubmission(
  db: Db,
  submissionId: string,
  values: Partial<NewSubmission>,
) {
  const [row] = await db
    .update(submissions)
    .set(values)
    .where(eq(submissions.id, submissionId))
    .returning();
  return row ?? null;
}

export async function listMySubmissions(db: Db, userId: string) {
  return db
    .select({
      submission: submissions,
      companyLegalName: companies.legalName,
      companyLegalNameAr: companies.legalNameAr,
      companyTradeName: companies.tradeName,
      companyUniqueIdentifier: companies.uniqueIdentifier,
      agencyNameFr: agencies.nameFr,
      agencyNameAr: agencies.nameAr,
    })
    .from(submissions)
    .leftJoin(companies, eq(companies.id, submissions.companyId))
    .leftJoin(agencies, eq(agencies.id, submissions.agencyId))
    .where(and(eq(submissions.submittedByUserId, userId), isNull(submissions.deletedAt)))
    .orderBy(desc(submissions.createdAt))
    .limit(100);
}

export async function listCompanySubmissions(
  db: Db,
  input: { companyId: string; status?: Submission["status"]; limit?: number },
) {
  const conditions: SQL[] = [
    eq(submissions.companyId, input.companyId),
    isNull(submissions.deletedAt),
  ];
  if (input.status) {
    conditions.push(eq(submissions.status, input.status));
  }

  return db
    .select({
      submission: submissions,
      companyLegalName: companies.legalName,
      companyLegalNameAr: companies.legalNameAr,
      companyTradeName: companies.tradeName,
      agencyNameFr: agencies.nameFr,
      agencyNameAr: agencies.nameAr,
    })
    .from(submissions)
    .leftJoin(companies, eq(companies.id, submissions.companyId))
    .leftJoin(agencies, eq(agencies.id, submissions.agencyId))
    .where(and(...conditions))
    .orderBy(desc(submissions.createdAt))
    .limit(input.limit ?? 50);
}

export async function findCompanySubmission(db: Db, companyId: string, submissionId: string) {
  const [row] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.id, submissionId),
        eq(submissions.companyId, companyId),
        isNull(submissions.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findAgencySubmission(db: Db, agencyId: string, submissionId: string) {
  const [row] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.id, submissionId),
        eq(submissions.agencyId, agencyId),
        isNull(submissions.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listSubmissionDocuments(db: Db, submissionId: string) {
  return db
    .select({
      document: documents,
      version: documentVersions,
      addedAt: submissionDocuments.addedAt,
    })
    .from(submissionDocuments)
    .innerJoin(documentVersions, eq(documentVersions.id, submissionDocuments.documentVersionId))
    .leftJoin(documents, eq(documents.id, documentVersions.documentId))
    .where(eq(submissionDocuments.submissionId, submissionId));
}

export async function listSubmissionReviews(db: Db, submissionId: string) {
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.submissionId, submissionId))
    .orderBy(desc(reviews.decidedAt));
}

export async function listSubmissionActivity(db: Db, submissionId: string) {
  return db
    .select()
    .from(activityEvents)
    .where(
      and(eq(activityEvents.entityType, "submission"), eq(activityEvents.entityId, submissionId)),
    )
    .orderBy(desc(activityEvents.createdAt))
    .limit(50);
}

export async function findCompanyById(db: Db, companyId: string) {
  const [row] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return row ?? null;
}

export async function findAgencyById(db: Db, agencyId: string) {
  const [row] = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
  return row ?? null;
}

export async function findDocumentVersionWithDocument(db: Db, documentVersionId: string) {
  const [row] = await db
    .select({ version: documentVersions, document: documents })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .where(eq(documentVersions.id, documentVersionId))
    .limit(1);
  return row ?? null;
}

export async function findAgencyDocumentLink(db: Db, documentVersionId: string, agencyId: string) {
  const [row] = await db
    .select({ submissionId: submissionDocuments.submissionId })
    .from(submissionDocuments)
    .innerJoin(submissions, eq(submissions.id, submissionDocuments.submissionId))
    .where(
      and(
        eq(submissionDocuments.documentVersionId, documentVersionId),
        eq(submissions.agencyId, agencyId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listMyAgencies(db: Db, userId: string) {
  return db
    .select({ agency: agencies, role: agencyMemberships.role })
    .from(agencyMemberships)
    .innerJoin(agencies, eq(agencies.id, agencyMemberships.agencyId))
    .where(
      and(
        eq(agencyMemberships.userId, userId),
        eq(agencyMemberships.status, "active"),
        eq(agencies.active, true),
      ),
    )
    .orderBy(agencies.nameFr);
}

export async function listAllActiveAgencies(db: Db) {
  return db.select().from(agencies).where(eq(agencies.active, true)).orderBy(asc(agencies.nameFr));
}

export async function listOfficerQueue(
  db: Db,
  input: {
    agencyId: string;
    status?: Submission["status"];
    tier?: Submission["cleanlinessTier"];
    sort?: "cleanliness" | "submittedAt";
    limit: number;
    offset: number;
  },
) {
  const conditions: SQL[] = [
    eq(submissions.agencyId, input.agencyId),
    isNull(submissions.deletedAt),
  ];
  if (input.status) {
    conditions.push(eq(submissions.status, input.status));
  } else {
    conditions.push(inArray(submissions.status, [...SUBMISSION_ATTENTION_STATUSES]));
  }
  if (input.tier) {
    conditions.push(eq(submissions.cleanlinessTier, input.tier));
  }

  const tierRank = sql`case ${submissions.cleanlinessTier} when 'clean' then 0 when 'minor_concern' then 1 else 2 end`;

  const orderBy =
    input.sort === "submittedAt"
      ? [asc(submissions.submittedAt), asc(submissions.createdAt)]
      : [asc(tierRank), desc(submissions.cleanlinessScore), asc(submissions.submittedAt)];

  return db
    .select({
      submission: submissions,
      companyLegalName: companies.legalName,
      companyLegalNameAr: companies.legalNameAr,
      companyTradeName: companies.tradeName,
      companyUniqueIdentifier: companies.uniqueIdentifier,
    })
    .from(submissions)
    .leftJoin(companies, eq(companies.id, submissions.companyId))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(input.limit + 1)
    .offset(input.offset);
}

export async function listSubmissionsByAgencyCompany(db: Db, agencyId: string, companyId: string) {
  return db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.agencyId, agencyId),
        eq(submissions.companyId, companyId),
        isNull(submissions.deletedAt),
      ),
    )
    .limit(100);
}

export async function listReviewsForSubmissions(db: Db, submissionIds: string[]) {
  if (submissionIds.length === 0) {
    return [];
  }
  return db.select().from(reviews).where(inArray(reviews.submissionId, submissionIds));
}

export async function insertReview(db: Db, values: NewReview) {
  const [row] = await db.insert(reviews).values(values).returning();
  return row ?? null;
}

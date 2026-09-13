import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";

import {
  activityEvents,
  agencies,
  agencyMemberships,
  cases,
  checkRuns,
  companies,
  companyRegistrySnapshots,
  documents,
  documentVersions,
  findings,
  profiles,
  submissions,
  submissionDocuments,
  filings,
  type AgencyMembership,
} from "@nationa/db";
import { users } from "@nationa/db/schema/users";

import type { Db } from "../context";

/* Company projections */

const companySummaryColumns = {
  id: companies.id,
  legalName: companies.legalName,
  legalNameAr: companies.legalNameAr,
  tradeName: companies.tradeName,
  uniqueIdentifier: companies.uniqueIdentifier,
  legalForm: companies.legalForm,
  taxId: companies.taxId,
  registryState: companies.registryState,
  status: companies.status,
};

export async function searchCompanies(db: Db, query: string, limit: number) {
  const pattern = `%${query.trim()}%`;
  return db
    .select(companySummaryColumns)
    .from(companies)
    .where(
      and(
        isNull(companies.deletedAt),
        or(
          ilike(companies.legalName, pattern),
          ilike(companies.tradeName, pattern),
          ilike(companies.uniqueIdentifier, pattern),
          ilike(companies.taxId, pattern),
        ),
      ),
    )
    .orderBy(asc(companies.legalName))
    .limit(limit);
}

export async function findCompanyById(db: Db, companyId: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
    .limit(1);
  return company ?? null;
}

export async function listCompaniesByIds(db: Db, ids: string[]) {
  if (ids.length === 0) {
    return [];
  }
  return db
    .select(companySummaryColumns)
    .from(companies)
    .where(and(inArray(companies.id, ids), isNull(companies.deletedAt)));
}

export async function listCompaniesForAgency(db: Db, agencyId: string, limit: number) {
  return db
    .select(companySummaryColumns)
    .from(submissions)
    .innerJoin(companies, eq(companies.id, submissions.companyId))
    .where(
      and(
        eq(submissions.agencyId, agencyId),
        isNull(submissions.deletedAt),
        isNull(companies.deletedAt),
      ),
    )
    .groupBy(companies.id)
    .orderBy(desc(sql`max(${submissions.createdAt})`))
    .limit(limit);
}

export async function listAgenciesByIds(db: Db, ids: string[]) {
  if (ids.length === 0) {
    return [];
  }
  return db
    .select({ id: agencies.id, nameFr: agencies.nameFr, nameAr: agencies.nameAr })
    .from(agencies)
    .where(inArray(agencies.id, ids));
}

/* Cross-agency summaries */

export type AgencySummarySubmission = {
  id: string;
  agencyId: string;
  companyId: string;
  status: string;
  submittedAt: Date | null;
  decidedAt: Date | null;
  createdAt: Date;
};

export type AgencySummaryFiling = {
  companyId: string;
  agencyId: string;
  status: string;
};

export type AgencySummaryCount = {
  companyId: string;
  agencyId: string;
  total: number;
  pending: number;
};

export async function listAgencySummariesForCompanies(
  db: Db,
  companyIds: string[],
  agencyIds: string[],
): Promise<{
  submissions: AgencySummarySubmission[];
  filings: AgencySummaryFiling[];
  counts: AgencySummaryCount[];
}> {
  if (companyIds.length === 0 || agencyIds.length === 0) {
    return { submissions: [], filings: [], counts: [] };
  }

  const [submissionRows, filingRows, countRows] = await Promise.all([
    db
      .select({
        id: submissions.id,
        agencyId: submissions.agencyId,
        companyId: submissions.companyId,
        status: submissions.status,
        submittedAt: submissions.submittedAt,
        decidedAt: submissions.decidedAt,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .where(
        and(
          inArray(submissions.companyId, companyIds),
          inArray(submissions.agencyId, agencyIds),
          isNull(submissions.deletedAt),
        ),
      )
      .orderBy(desc(submissions.createdAt)),
    db
      .select({
        companyId: filings.companyId,
        agencyId: filings.agencyId,
        status: filings.status,
      })
      .from(filings)
      .where(and(inArray(filings.companyId, companyIds), inArray(filings.agencyId, agencyIds))),
    db
      .select({
        companyId: submissions.companyId,
        agencyId: submissions.agencyId,
        total: count(),
        pending:
          sql<number>`count(*) filter (where ${submissions.status} not in ('approved', 'rejected'))`.mapWith(
            Number,
          ),
      })
      .from(submissions)
      .where(
        and(
          inArray(submissions.companyId, companyIds),
          inArray(submissions.agencyId, agencyIds),
          isNull(submissions.deletedAt),
        ),
      )
      .groupBy(submissions.companyId, submissions.agencyId),
  ]);

  return { submissions: submissionRows, filings: filingRows, counts: countRows };
}

export async function listFindingCountsBySubmissionIds(db: Db, submissionIds: string[]) {
  if (submissionIds.length === 0) {
    return [] as { submissionId: string; total: number }[];
  }
  return db
    .select({
      submissionId: checkRuns.subjectId,
      total: sql<number>`count(${findings.id})`.mapWith(Number),
    })
    .from(checkRuns)
    .innerJoin(findings, eq(findings.checkRunId, checkRuns.id))
    .where(
      and(eq(checkRuns.subjectType, "submission"), inArray(checkRuns.subjectId, submissionIds)),
    )
    .groupBy(checkRuns.subjectId);
}

/* Documents */

export async function listCompanyDocuments(db: Db, companyId: string) {
  // Documents may be attached directly to the company or only to one of its cases.
  return db
    .select({
      id: documents.id,
      title: documents.title,
      status: documents.status,
      documentTypeId: documents.documentTypeId,
      currentVersionId: documents.currentVersionId,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(cases, eq(cases.id, documents.caseId))
    .where(
      and(
        or(eq(documents.companyId, companyId), eq(cases.companyId, companyId)),
        isNull(documents.deletedAt),
      ),
    )
    .orderBy(desc(documents.createdAt));
}

export async function listDocumentVersionsForDocuments(db: Db, documentIds: string[]) {
  if (documentIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(documentVersions)
    .where(inArray(documentVersions.documentId, documentIds))
    .orderBy(desc(documentVersions.version));
}

export async function listSubmissionAgencyLinksForDocuments(
  db: Db,
  documentVersionIds: string[],
  agencyIds: string[],
) {
  if (documentVersionIds.length === 0 || agencyIds.length === 0) {
    return [] as { documentVersionId: string; agencyId: string; companyId: string }[];
  }
  return db
    .select({
      documentVersionId: submissionDocuments.documentVersionId,
      agencyId: submissions.agencyId,
      companyId: submissions.companyId,
    })
    .from(submissionDocuments)
    .innerJoin(submissions, eq(submissions.id, submissionDocuments.submissionId))
    .where(
      and(
        inArray(submissionDocuments.documentVersionId, documentVersionIds),
        inArray(submissions.agencyId, agencyIds),
        isNull(submissions.deletedAt),
      ),
    );
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

export async function listLatestSnapshotsForCompany(db: Db, companyId: string) {
  return db
    .select()
    .from(companyRegistrySnapshots)
    .where(eq(companyRegistrySnapshots.companyId, companyId))
    .orderBy(desc(companyRegistrySnapshots.createdAt))
    .limit(5);
}

/* Activity */

export async function listCompanyActivity(db: Db, companyId: string, limit = 100) {
  return db
    .select()
    .from(activityEvents)
    .where(eq(activityEvents.companyId, companyId))
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit);
}

/* Agency members */

export async function listAgencyMembers(db: Db, agencyId: string) {
  return db
    .select({
      userId: agencyMemberships.userId,
      email: users.email,
      displayName: profiles.displayName,
      role: agencyMemberships.role,
      status: agencyMemberships.status,
      addedAt: agencyMemberships.addedAt,
    })
    .from(agencyMemberships)
    .leftJoin(profiles, eq(profiles.userId, agencyMemberships.userId))
    .leftJoin(users, eq(users.id, agencyMemberships.userId))
    .where(eq(agencyMemberships.agencyId, agencyId))
    .orderBy(asc(agencyMemberships.role), asc(profiles.displayName));
}

export async function findUserByEmail(db: Db, email: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.trim().toLowerCase()))
    .limit(1);
  return user ?? null;
}

export async function upsertAgencyMember(
  db: Db,
  input: {
    agencyId: string;
    userId: string;
    role: AgencyMembership["role"];
    status: AgencyMembership["status"];
    addedBy: string | null;
  },
) {
  const [row] = await db
    .insert(agencyMemberships)
    .values({
      agencyId: input.agencyId,
      userId: input.userId,
      role: input.role,
      status: input.status,
      addedBy: input.addedBy,
    })
    .onConflictDoUpdate({
      target: [agencyMemberships.agencyId, agencyMemberships.userId],
      set: { role: input.role, status: input.status },
    })
    .returning();
  return row ?? null;
}

export async function updateAgencyMember(
  db: Db,
  input: {
    agencyId: string;
    userId: string;
    role?: AgencyMembership["role"];
    status?: AgencyMembership["status"];
  },
) {
  const values: Partial<Pick<AgencyMembership, "role" | "status">> = {};
  if (input.role !== undefined) {
    values.role = input.role;
  }
  if (input.status !== undefined) {
    values.status = input.status;
  }

  if (Object.keys(values).length === 0) {
    const [existing] = await db
      .select()
      .from(agencyMemberships)
      .where(
        and(
          eq(agencyMemberships.agencyId, input.agencyId),
          eq(agencyMemberships.userId, input.userId),
        ),
      )
      .limit(1);
    return existing ?? null;
  }

  const [row] = await db
    .update(agencyMemberships)
    .set(values)
    .where(
      and(
        eq(agencyMemberships.agencyId, input.agencyId),
        eq(agencyMemberships.userId, input.userId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function countActiveAdmins(db: Db, agencyId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(agencyMemberships)
    .where(
      and(
        eq(agencyMemberships.agencyId, agencyId),
        eq(agencyMemberships.status, "active"),
        eq(agencyMemberships.role, "admin"),
      ),
    );
  return Number(row?.value ?? 0);
}

export async function listActiveMembershipsForUser(
  db: Db,
  userId: string,
  agencyIds?: string[],
): Promise<
  { agencyId: string; role: AgencyMembership["role"]; status: AgencyMembership["status"] }[]
> {
  if (agencyIds !== undefined && agencyIds.length === 0) {
    return [];
  }

  const conditions: SQL[] = [
    eq(agencyMemberships.userId, userId),
    eq(agencyMemberships.status, "active"),
  ];
  if (agencyIds) {
    conditions.push(inArray(agencyMemberships.agencyId, agencyIds));
  }

  return db
    .select({
      agencyId: agencyMemberships.agencyId,
      role: agencyMemberships.role,
      status: agencyMemberships.status,
    })
    .from(agencyMemberships)
    .where(and(...conditions));
}

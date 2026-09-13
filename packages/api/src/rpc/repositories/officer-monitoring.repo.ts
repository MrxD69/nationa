import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { companies, companyRegistrySnapshots, obligations, submissions } from "@nationa/db";

import type { Db } from "../context";

const MAX_COMPANIES = 1000;

const companyProjection = {
  id: companies.id,
  uniqueIdentifier: companies.uniqueIdentifier,
  legalName: companies.legalName,
  legalNameAr: companies.legalNameAr,
  tradeName: companies.tradeName,
  legalForm: companies.legalForm,
  capitalAmount: companies.capitalAmount,
  currency: companies.currency,
  registryType: companies.registryType,
  registryState: companies.registryState,
  status: companies.status,
  fiscalDefault: companies.fiscalDefault,
  lastFinancialStatementsDate: companies.lastFinancialStatementsDate,
  lastBeneficialDeclarationDate: companies.lastBeneficialDeclarationDate,
  activityStartDate: companies.activityStartDate,
  headquartersAddress: companies.headquartersAddress,
  createdAt: companies.createdAt,
};

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return MAX_COMPANIES;
  }
  return Math.min(Math.max(1, Math.trunc(limit)), MAX_COMPANIES);
}

export async function listActiveObligations(db: Db, agencyId: string) {
  return db
    .select()
    .from(obligations)
    .where(and(eq(obligations.agencyId, agencyId), eq(obligations.active, true)))
    .orderBy(asc(obligations.code));
}

export async function listAgencyCompanies(db: Db, agencyId: string, limit: number) {
  return db
    .selectDistinct(companyProjection)
    .from(companies)
    .innerJoin(submissions, eq(submissions.companyId, companies.id))
    .where(
      and(
        eq(submissions.agencyId, agencyId),
        isNull(submissions.deletedAt),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(asc(companies.legalName))
    .limit(clampLimit(limit));
}

export async function listAllActiveCompanies(db: Db, limit: number) {
  return db
    .select(companyProjection)
    .from(companies)
    .where(
      and(
        or(eq(companies.registryState, "actif"), eq(companies.status, "active")),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(asc(companies.legalName))
    .limit(clampLimit(limit));
}

export async function listLatestSnapshotsForCompanies(db: Db, companyIds: string[]) {
  if (companyIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(companyRegistrySnapshots)
    .where(inArray(companyRegistrySnapshots.companyId, companyIds))
    .orderBy(desc(companyRegistrySnapshots.createdAt))
    .limit(2000);
}

const OPEN_SUBMISSION_STATUSES = ["queued", "in_review", "escalated", "returned"] as const;

export async function listOpenSubmissionCompanyIds(db: Db, agencyId: string) {
  const rows = await db
    .selectDistinct({ companyId: submissions.companyId })
    .from(submissions)
    .where(
      and(
        eq(submissions.agencyId, agencyId),
        inArray(submissions.status, [...OPEN_SUBMISSION_STATUSES]),
        isNull(submissions.deletedAt),
      ),
    );
  return rows.map((row) => row.companyId);
}

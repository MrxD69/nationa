import { and, desc, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";

import {
  agencies,
  cases,
  companies,
  companyAccessGrants,
  obligations,
  ruleCitations,
  type Company,
  type Obligation,
  type RuleCitation,
} from "@nationa/db";

import type { Db } from "../context";

export async function getAccessibleCompanyIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ companyId: companyAccessGrants.companyId })
    .from(companyAccessGrants)
    .where(
      and(
        eq(companyAccessGrants.userId, userId),
        eq(companyAccessGrants.status, "active"),
        isNull(companyAccessGrants.revokedAt),
      ),
    );
  return rows.map((row) => row.companyId);
}

export async function loadCompany(db: Db, companyId: string): Promise<Company | null> {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
    .limit(1);
  return company ?? null;
}

export async function loadCaseCompanyId(db: Db, caseId: string): Promise<string | null> {
  const [row] = await db
    .select({ companyId: cases.companyId })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);
  return row?.companyId ?? null;
}

export type RuleSearchResult = {
  id: string;
  source: string;
  article: string | null;
  titleFr: string | null;
  titleAr: string | null;
  textFr: string | null;
  textAr: string | null;
  url: string | null;
};

function toRuleResult(row: RuleCitation): RuleSearchResult {
  return {
    id: row.id,
    source: row.source,
    article: row.article,
    titleFr: row.titleFr,
    titleAr: row.titleAr,
    textFr: row.textFr,
    textAr: row.textAr,
    url: row.url,
  };
}

export async function findRuleCitationById(
  db: Db,
  ruleCitationId: string,
): Promise<RuleSearchResult | null> {
  const [row] = await db
    .select()
    .from(ruleCitations)
    .where(eq(ruleCitations.id, ruleCitationId))
    .limit(1);
  return row ? toRuleResult(row) : null;
}

export async function listRuleCitationsByIds(db: Db, ids: string[]): Promise<RuleCitation[]> {
  if (ids.length === 0) {
    return [];
  }
  return db.select().from(ruleCitations).where(inArray(ruleCitations.id, ids));
}

export async function searchRuleCitations(
  db: Db,
  input: { query: string; limit?: number; ruleCitationId?: string },
): Promise<RuleSearchResult[]> {
  if (input.ruleCitationId) {
    const rule = await findRuleCitationById(db, input.ruleCitationId);
    return rule ? [rule] : [];
  }

  const limit = Math.min(Math.max(input.limit ?? 6, 1), 20);
  const query = input.query.trim();
  if (query.length === 0) {
    const rows = await db.select().from(ruleCitations).limit(limit);
    return rows.map(toRuleResult);
  }

  const term = `%${query}%`;
  const rows = await db
    .select()
    .from(ruleCitations)
    .where(
      or(
        ilike(ruleCitations.source, term),
        ilike(ruleCitations.article, term),
        ilike(ruleCitations.titleFr, term),
        ilike(ruleCitations.titleAr, term),
        ilike(ruleCitations.textFr, term),
        ilike(ruleCitations.textAr, term),
      ),
    )
    .limit(limit);
  return rows.map(toRuleResult);
}

export type ObligationLookupResult = {
  id: string;
  code: string;
  nameFr: string;
  nameAr: string | null;
  agencyId: string;
  description: string | null;
  legalBasis: string | null;
  periodicity: string;
  deadlineRule: unknown;
  penaltySummary: string | null;
};

function toObligationResult(row: Obligation): ObligationLookupResult {
  return {
    id: row.id,
    code: row.code,
    nameFr: row.nameFr,
    nameAr: row.nameAr,
    agencyId: row.agencyId,
    description: row.description,
    legalBasis: row.legalBasis,
    periodicity: row.periodicity,
    deadlineRule: row.deadlineRule,
    penaltySummary: row.penaltySummary,
  };
}

export async function lookupObligationCatalog(
  db: Db,
  input: { query?: string; agencyId?: string; limit?: number },
): Promise<ObligationLookupResult[]> {
  const conditions: SQL[] = [eq(obligations.active, true)];
  if (input.agencyId) {
    conditions.push(eq(obligations.agencyId, input.agencyId));
  }
  const query = input.query?.trim();
  if (query) {
    const term = `%${query}%`;
    const matches = or(
      ilike(obligations.nameFr, term),
      ilike(obligations.nameAr, term),
      ilike(obligations.code, term),
      ilike(obligations.description, term),
      ilike(obligations.legalBasis, term),
    );
    if (matches) {
      conditions.push(matches);
    }
  }

  const rows = await db
    .select()
    .from(obligations)
    .where(and(...conditions))
    .orderBy(desc(obligations.active))
    .limit(Math.min(Math.max(input.limit ?? 10, 1), 30));
  return rows.map(toObligationResult);
}

export async function listActiveObligations(
  db: Db,
  input: { agencyId?: string; limit?: number } = {},
): Promise<ObligationLookupResult[]> {
  return lookupObligationCatalog(db, { agencyId: input.agencyId, limit: input.limit });
}

export type CompanyProfile = {
  id: string;
  legalName: string;
  legalNameAr: string | null;
  tradeName: string | null;
  taxId: string | null;
  uniqueIdentifier: string | null;
  registryState: string;
  registryType: string | null;
  legalForm: string | null;
  activityStartDate: string | null;
  fiscalDefault: string;
  mainActivityLabel: string | null;
};

export function toCompanyProfile(company: Company): CompanyProfile {
  return {
    id: company.id,
    legalName: company.legalName,
    legalNameAr: company.legalNameAr,
    tradeName: company.tradeName,
    taxId: company.taxId,
    uniqueIdentifier: company.uniqueIdentifier,
    registryState: company.registryState,
    registryType: company.registryType,
    legalForm: company.legalForm,
    activityStartDate: company.activityStartDate,
    fiscalDefault: company.fiscalDefault,
    mainActivityLabel: company.mainActivityLabel,
  };
}

export type AgencyRef = { id: string; nameFr: string; nameAr: string | null };

export async function listAgencies(db: Db, ids: string[]): Promise<AgencyRef[]> {
  if (ids.length === 0) {
    return [];
  }
  return db
    .select({ id: agencies.id, nameFr: agencies.nameFr, nameAr: agencies.nameAr })
    .from(agencies)
    .where(inArray(agencies.id, ids));
}

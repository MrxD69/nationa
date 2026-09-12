import { and, asc, desc, eq, gt, inArray, isNull, or, type SQL } from "drizzle-orm";

import {
  accessInvitations,
  companies,
  companyAccessGrants,
  fieldProvenance,
  type NewAccessInvitation,
  type NewCompany,
  type NewCompanyAccessGrant,
  type NewFieldProvenance,
} from "@nationa/db";
import { users } from "@nationa/db/schema/users";

import type { Db } from "../context";

export type CompanyAccessRole = NewCompanyAccessGrant["role"];

export async function findActiveGrantByUser(db: Db, userId: string) {
  const [grant] = await db
    .select({ companyId: companyAccessGrants.companyId })
    .from(companyAccessGrants)
    .where(
      and(
        eq(companyAccessGrants.userId, userId),
        eq(companyAccessGrants.status, "active"),
        isNull(companyAccessGrants.revokedAt),
        or(isNull(companyAccessGrants.expiresAt), gt(companyAccessGrants.expiresAt, new Date())),
      ),
    )
    .limit(1);

  return grant ?? null;
}

export async function listCompanyEntries(
  db: Db,
  params: {
    userId: string;
    accountingOnly: boolean;
    accountingRoles: CompanyAccessRole[];
  },
) {
  const conditions: (SQL | undefined)[] = [
    eq(companyAccessGrants.userId, params.userId),
    eq(companyAccessGrants.status, "active"),
    isNull(companyAccessGrants.revokedAt),
    isNull(companies.deletedAt),
    or(isNull(companyAccessGrants.expiresAt), gt(companyAccessGrants.expiresAt, new Date())),
  ];

  if (params.accountingOnly) {
    conditions.push(inArray(companyAccessGrants.role, params.accountingRoles));
  }

  return db
    .select({
      company: companies,
      role: companyAccessGrants.role,
      scopes: companyAccessGrants.scopes,
    })
    .from(companyAccessGrants)
    .innerJoin(companies, eq(companies.id, companyAccessGrants.companyId))
    .where(and(...conditions))
    .orderBy(desc(companies.createdAt));
}

export async function insertCompany(db: Db, values: NewCompany) {
  const [company] = await db.insert(companies).values(values).returning();
  return company ?? null;
}

export async function upsertCompanyGrant(db: Db, values: NewCompanyAccessGrant, updatedAt: Date) {
  await db
    .insert(companyAccessGrants)
    .values(values)
    .onConflictDoUpdate({
      target: [companyAccessGrants.companyId, companyAccessGrants.userId],
      set: {
        role: values.role,
        scopes: values.scopes,
        status: "active",
        revokedAt: null,
        updatedAt,
      },
    });
}

export async function findCompanyById(db: Db, companyId: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
    .limit(1);

  return company ?? null;
}

export async function findCompanyByUniqueIdentifier(db: Db, uniqueIdentifier: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.uniqueIdentifier, uniqueIdentifier), isNull(companies.deletedAt)))
    .limit(1);

  return company ?? null;
}

export async function listCompanyProvenance(db: Db, companyId: string) {
  return db
    .select()
    .from(fieldProvenance)
    .where(
      and(eq(fieldProvenance.subjectType, "company"), eq(fieldProvenance.subjectId, companyId)),
    )
    .orderBy(desc(fieldProvenance.createdAt));
}

export async function updateCompanyColumns(
  db: Db,
  companyId: string,
  columns: Partial<NewCompany>,
) {
  await db.update(companies).set(columns).where(eq(companies.id, companyId));
}

export async function insertCompanyProvenance(db: Db, rows: NewFieldProvenance[]) {
  if (rows.length === 0) {
    return;
  }

  await db.insert(fieldProvenance).values(rows);
}

export async function listCompanyMembers(db: Db, companyId: string) {
  return db
    .select({
      userId: companyAccessGrants.userId,
      email: users.email,
      role: companyAccessGrants.role,
      scopes: companyAccessGrants.scopes,
      status: companyAccessGrants.status,
      grantedAt: companyAccessGrants.grantedAt,
      expiresAt: companyAccessGrants.expiresAt,
      revokedAt: companyAccessGrants.revokedAt,
    })
    .from(companyAccessGrants)
    .leftJoin(users, eq(users.id, companyAccessGrants.userId))
    .where(eq(companyAccessGrants.companyId, companyId))
    .orderBy(asc(companyAccessGrants.grantedAt));
}

export async function insertInvitation(db: Db, values: NewAccessInvitation) {
  const [invitation] = await db.insert(accessInvitations).values(values).returning();
  return invitation ?? null;
}

export async function findInvitationByToken(db: Db, token: string) {
  const [invitation] = await db
    .select()
    .from(accessInvitations)
    .where(eq(accessInvitations.token, token))
    .limit(1);

  return invitation ?? null;
}

export async function revokeAccessGrant(db: Db, companyId: string, userId: string) {
  const now = new Date();
  const [updated] = await db
    .update(companyAccessGrants)
    .set({ status: "revoked", revokedAt: now, updatedAt: now })
    .where(
      and(eq(companyAccessGrants.companyId, companyId), eq(companyAccessGrants.userId, userId)),
    )
    .returning();

  return updated ?? null;
}

export async function markInvitationAccepted(db: Db, invitationId: string, acceptedAt: Date) {
  await db
    .update(accessInvitations)
    .set({ acceptedAt })
    .where(eq(accessInvitations.id, invitationId));
}

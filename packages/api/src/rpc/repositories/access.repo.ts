import { and, eq } from "drizzle-orm";

import { agencyMemberships, companyAccessGrants } from "@nationa/db";

import type { Db } from "../context";

export async function findCompanyGrant(db: Db, companyId: string, userId: string) {
  const [grant] = await db
    .select()
    .from(companyAccessGrants)
    .where(
      and(eq(companyAccessGrants.companyId, companyId), eq(companyAccessGrants.userId, userId)),
    )
    .limit(1);

  return grant ?? null;
}

export async function findAgencyMembership(db: Db, agencyId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(agencyMemberships)
    .where(and(eq(agencyMemberships.agencyId, agencyId), eq(agencyMemberships.userId, userId)))
    .limit(1);

  return membership ?? null;
}

export async function listActiveAgencyMemberships(db: Db, userId: string) {
  return db
    .select()
    .from(agencyMemberships)
    .where(and(eq(agencyMemberships.userId, userId), eq(agencyMemberships.status, "active")));
}

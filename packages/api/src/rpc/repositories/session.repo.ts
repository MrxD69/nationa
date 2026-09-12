import { and, eq } from "drizzle-orm";

import { agencies, agencyMemberships } from "@nationa/db";

import type { Db } from "../context";

export async function listUserAgencies(db: Db, userId: string) {
  return db
    .select({
      agencyId: agencyMemberships.agencyId,
      role: agencyMemberships.role,
      nameFr: agencies.nameFr,
      nameAr: agencies.nameAr,
    })
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

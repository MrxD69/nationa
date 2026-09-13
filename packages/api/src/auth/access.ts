import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import { agencyMemberships, companyAccessGrants } from "@nationa/db";

import type { AuthUser, Context } from "../context";
import {
  assertCan,
  type AgencyPermission,
  type AgencyRole,
  type CompanyPermission,
  type CompanyRole,
} from "../permissions";
import { findAgencyMembership, findCompanyGrant } from "../rpc/repositories/access.repo";
import { findProfileByUserId } from "../rpc/repositories/profiles.repo";

export type CompanyAccess = {
  companyId: string;
  role: string;
  scopes: string[];
};

export type AgencyAccess = {
  agencyId: string;
  role: string;
};

export type CompanyPermissionAccess = {
  companyId: string;
  role: CompanyRole;
  scopes: string[];
};

const COMPANY_ADMIN_ROLES = new Set(["admin", "owner"]);

/**
 * A ministry agent is a platform-level role (`profiles.accountType = "admin"`)
 * that oversees every organization. It never throws and returns `false` when
 * the user is missing, has no profile row, or is a normal account.
 */
export async function isMinistryAgent(context: Context, userId?: string): Promise<boolean> {
  const id = userId ?? context.user?.id;
  if (!id) {
    return false;
  }
  try {
    const profile = await findProfileByUserId(context.db, id);
    return profile?.accountType === "admin";
  } catch {
    return false;
  }
}

export function requireUser(context: Context): AuthUser {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Authentication required",
    });
  }
  return context.user;
}

export async function assertCompanyAccess(
  context: Context,
  companyId: string,
  requiredScopes: string[] = [],
): Promise<CompanyAccess> {
  const user = requireUser(context);

  const [grant] = await context.db
    .select()
    .from(companyAccessGrants)
    .where(
      and(eq(companyAccessGrants.companyId, companyId), eq(companyAccessGrants.userId, user.id)),
    )
    .limit(1);

  if (!grant) {
    throw new ORPCError("FORBIDDEN", {
      message: "No access to this company",
      data: { companyId },
    });
  }

  const now = Date.now();
  const revoked = grant.revokedAt !== null || grant.status === "revoked";
  const expired = grant.expiresAt !== null && grant.expiresAt.getTime() <= now;

  if (revoked || expired || grant.status !== "active") {
    throw new ORPCError("FORBIDDEN", {
      message: "Company access is not active",
      data: { companyId, status: grant.status },
    });
  }

  const isAdmin = COMPANY_ADMIN_ROLES.has(grant.role);
  if (!isAdmin && requiredScopes.length > 0) {
    const missingScopes = requiredScopes.filter((scope) => !grant.scopes.includes(scope));
    if (missingScopes.length > 0) {
      throw new ORPCError("FORBIDDEN", {
        message: "Missing required company scope",
        data: { companyId, missingScopes },
      });
    }
  }

  return {
    companyId,
    role: grant.role,
    scopes: grant.scopes,
  };
}

export async function assertAgencyAccess(
  context: Context,
  agencyId: string,
  roles: string[] = [],
): Promise<AgencyAccess> {
  const user = requireUser(context);

  const [membership] = await context.db
    .select()
    .from(agencyMemberships)
    .where(and(eq(agencyMemberships.agencyId, agencyId), eq(agencyMemberships.userId, user.id)))
    .limit(1);

  if (!membership || membership.status !== "active") {
    throw new ORPCError("FORBIDDEN", {
      message: "No access to this agency",
      data: { agencyId },
    });
  }

  if (roles.length > 0 && !roles.includes(membership.role)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Insufficient agency role",
      data: { agencyId, role: membership.role },
    });
  }

  return {
    agencyId,
    role: membership.role,
  };
}

export async function assertCompanyPermission(
  context: Context,
  companyId: string,
  permission: CompanyPermission,
): Promise<CompanyPermissionAccess> {
  const user = requireUser(context);

  const grant = await findCompanyGrant(context.db, companyId, user.id);

  if (!grant) {
    throw new ORPCError("FORBIDDEN", {
      message: "No access to this company",
      data: { companyId },
    });
  }

  const now = Date.now();
  const revoked = grant.revokedAt !== null || grant.status === "revoked";
  const expired = grant.expiresAt !== null && grant.expiresAt.getTime() <= now;

  if (revoked || expired || grant.status !== "active") {
    throw new ORPCError("FORBIDDEN", {
      message: "Company access is not active",
      data: { companyId, status: grant.status },
    });
  }

  assertCan(grant.role, "company", permission, grant.scopes, { companyId });

  return {
    companyId,
    role: grant.role,
    scopes: grant.scopes,
  };
}

export async function assertAgencyPermission(
  context: Context,
  agencyId: string,
  permission: AgencyPermission,
): Promise<AgencyAccess> {
  const user = requireUser(context);

  const membership = await findAgencyMembership(context.db, agencyId, user.id);

  if (!membership || membership.status !== "active") {
    // Ministry agents oversee every organization: grant full agency permissions.
    if (await isMinistryAgent(context, user.id)) {
      assertCan("admin", "agency", permission, null, { agencyId });
      return { agencyId, role: "admin" };
    }

    throw new ORPCError("FORBIDDEN", {
      message: "No access to this agency",
      data: { agencyId },
    });
  }

  assertCan(membership.role as AgencyRole, "agency", permission, null, { agencyId });

  return {
    agencyId,
    role: membership.role,
  };
}

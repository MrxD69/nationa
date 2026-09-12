import { ORPCError } from "@orpc/server";

import {
  PERMISSIONS,
  type AgencyPermission,
  type CompanyPermission,
  type Permission,
  type PermissionScope,
  type PlatformPermission,
} from "./catalog";
import {
  AGENCY_ROLE_PERMISSIONS,
  COMPANY_ROLE_PERMISSIONS,
  FULL_ACCESS_COMPANY_ROLES,
  PLATFORM_ROLE_PERMISSIONS,
  type AgencyRole,
  type CompanyRole,
  type PlatformRole,
} from "./roles";

function isPermission(value: string): value is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}

// `scopes` are the legacy coarse COMPANY_SCOPES stored on company_access_grants
// (company.read/update/manage_access, documents.read/write/extract, ...). They do
// not include the finer permissions added since (cases.submit, documents.delete,
// documents.generate, ai.use, ...). Treating them as a narrowing filter would
// wrongly deny accountants/assistants, so the role matrix stays authoritative and
// scopes are only additive (base ∪ scopes) for non-full-access roles.
function extraScopedPermissions(
  scope: PermissionScope,
  scopes?: readonly string[] | null,
): Permission[] {
  if (!scopes || scopes.length === 0) {
    return [];
  }
  return scopes.filter(
    (value): value is Permission => isPermission(value) && PERMISSIONS[value].scope === scope,
  );
}

function basePermissionsFor(role: string, scope: PermissionScope): readonly Permission[] {
  switch (scope) {
    case "company":
      return COMPANY_ROLE_PERMISSIONS[role as CompanyRole];
    case "agency":
      return AGENCY_ROLE_PERMISSIONS[role as AgencyRole];
    case "platform":
      return PLATFORM_ROLE_PERMISSIONS[role as PlatformRole];
  }
}

function hasPermission(
  role: string,
  scope: PermissionScope,
  permission: Permission,
  scopes?: readonly string[] | null,
): boolean {
  const base = basePermissionsFor(role, scope);
  if (base.includes(permission)) {
    return true;
  }

  const fullAccess =
    scope === "company" && (FULL_ACCESS_COMPANY_ROLES as readonly string[]).includes(role);
  if (fullAccess) {
    return true;
  }

  return extraScopedPermissions(scope, scopes).includes(permission);
}

export function effectivePermissions(
  role: CompanyRole,
  scope: "company",
  scopes?: readonly string[] | null,
): CompanyPermission[];
export function effectivePermissions(
  role: AgencyRole,
  scope: "agency",
  scopes?: readonly string[] | null,
): AgencyPermission[];
export function effectivePermissions(
  role: PlatformRole,
  scope: "platform",
  scopes?: readonly string[] | null,
): PlatformPermission[];
export function effectivePermissions(
  role: string,
  scope: PermissionScope,
  scopes?: readonly string[] | null,
): Permission[] {
  const base = basePermissionsFor(role, scope);
  const fullAccess =
    scope === "company" && (FULL_ACCESS_COMPANY_ROLES as readonly string[]).includes(role);
  if (fullAccess) {
    return [...base];
  }

  return [...new Set<Permission>([...base, ...extraScopedPermissions(scope, scopes)])];
}

export function can(
  role: CompanyRole,
  scope: "company",
  permission: CompanyPermission,
  scopes?: readonly string[] | null,
): boolean;
export function can(
  role: AgencyRole,
  scope: "agency",
  permission: AgencyPermission,
  scopes?: readonly string[] | null,
): boolean;
export function can(
  role: PlatformRole,
  scope: "platform",
  permission: PlatformPermission,
  scopes?: readonly string[] | null,
): boolean;
export function can(
  role: string,
  scope: PermissionScope,
  permission: Permission,
  scopes?: readonly string[] | null,
): boolean {
  return hasPermission(role, scope, permission, scopes);
}

export function assertCan(
  role: CompanyRole,
  scope: "company",
  permission: CompanyPermission,
  scopes?: readonly string[] | null,
  meta?: Record<string, unknown>,
): void;
export function assertCan(
  role: AgencyRole,
  scope: "agency",
  permission: AgencyPermission,
  scopes?: readonly string[] | null,
  meta?: Record<string, unknown>,
): void;
export function assertCan(
  role: PlatformRole,
  scope: "platform",
  permission: PlatformPermission,
  scopes?: readonly string[] | null,
  meta?: Record<string, unknown>,
): void;
export function assertCan(
  role: string,
  scope: PermissionScope,
  permission: Permission,
  scopes?: readonly string[] | null,
  meta?: Record<string, unknown>,
): void {
  if (hasPermission(role, scope, permission, scopes)) {
    return;
  }

  throw new ORPCError("FORBIDDEN", {
    message: "Missing permission",
    data: { permission, role, scope, ...meta },
  });
}

import { ORPCError } from "@orpc/server";

import type { CompanyAccess } from "../auth/access";
import { COMPANY_SCOPES, type CompanyScope } from "../domain/scopes";

const FULL_ACCESS_ROLES = new Set(["owner", "admin"]);

/**
 * `companyProcedure` resolves the caller's grant but does not enforce scopes.
 * Use this guard inside handlers that need a specific capability.
 */
export function requireCompanyScopes(access: CompanyAccess, scopes: readonly CompanyScope[]): void {
  if (scopes.length === 0 || FULL_ACCESS_ROLES.has(access.role)) {
    return;
  }

  const missing = scopes.filter((scope) => !access.scopes.includes(scope));
  if (missing.length > 0) {
    throw new ORPCError("FORBIDDEN", {
      message: "Missing required company scope",
      data: { companyId: access.companyId, missingScopes: missing },
    });
  }
}

export function defaultScopesForRole(role: string): CompanyScope[] {
  switch (role) {
    case "owner":
    case "admin":
    case "accountant":
      return [...COMPANY_SCOPES];
    case "accountant_assistant":
      return [
        "company.read",
        "documents.read",
        "documents.write",
        "cases.read",
        "filings.read",
        "invoices.read",
      ];
    case "employee":
      return ["company.read"];
    default:
      return ["company.read"];
  }
}

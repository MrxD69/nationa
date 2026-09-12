import { ORPCError, os } from "@orpc/server";

import { assertAgencyPermission, assertCompanyPermission, requireUser } from "../auth/access";
import type { AgencyPermission, CompanyPermission } from "../permissions";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

export const userProcedure = o.use(({ context, next }) => {
  const user = requireUser(context);
  return next({ context: { user } });
});

export const authedProcedure = userProcedure;

function extractId(input: unknown, key: "companyId" | "agencyId"): string {
  if (input && typeof input === "object" && key in input) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  throw new ORPCError("BAD_REQUEST", {
    message: `${key} is required`,
  });
}

export const companyProcedure = (permission: CompanyPermission) =>
  userProcedure.use(async ({ context, next }, input) => {
    const companyId = extractId(input, "companyId");
    const companyAccess = await assertCompanyPermission(context, companyId, permission);
    return next({ context: { companyId, companyAccess } });
  });

export const agencyProcedure = (permission: AgencyPermission) =>
  userProcedure.use(async ({ context, next }, input) => {
    const agencyId = extractId(input, "agencyId");
    const agencyAccess = await assertAgencyPermission(context, agencyId, permission);
    return next({ context: { agencyId, agencyAccess } });
  });

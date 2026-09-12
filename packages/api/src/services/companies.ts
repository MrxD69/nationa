import type { Context } from "../context";
import {
  acceptInvitation as acceptInvitationService,
  connectCompany as connectCompanyService,
  createCompany as createCompanyService,
  getCompany as getCompanyService,
  inviteToCompany as inviteToCompanyService,
  listCompanies as listCompaniesService,
  listMembers as listMembersService,
  revokeGrant as revokeGrantService,
  updateCompany as updateCompanyService,
  userHasActiveCompany as userHasActiveCompanyService,
} from "../rpc/services/companies.service";
import type {
  CompanyCreateInput,
  CompanyPatchInput,
  InviteCompanyInput,
} from "../rpc/services/companies.service";

export {
  companyAccessRoleSchema,
  companyFieldInputSchema,
  companyPatchSchema,
  companyCreateSchema,
} from "../rpc/services/companies.service";
export type {
  CompanyAccessRole,
  CompanyCreateInput,
  CompanyPatchInput,
  InviteCompanyInput,
} from "../rpc/services/companies.service";

export function userHasActiveCompany(context: Context, userId: string) {
  return userHasActiveCompanyService(context, { userId });
}

export function listCompanies(context: Context, view: "all" | "accounting" = "all") {
  return listCompaniesService(context, { view });
}

export function createCompany(context: Context, input: CompanyCreateInput) {
  return createCompanyService(context, input);
}

export function getCompany(context: Context, companyId: string) {
  return getCompanyService(context, { companyId });
}

export function updateCompany(context: Context, companyId: string, patch: CompanyPatchInput) {
  return updateCompanyService(context, { companyId, patch });
}

export function connectCompany(context: Context, uniqueIdentifier: string) {
  return connectCompanyService(context, { uniqueIdentifier });
}

export function listMembers(context: Context, companyId: string) {
  return listMembersService(context, { companyId });
}

export function inviteToCompany(context: Context, input: InviteCompanyInput) {
  return inviteToCompanyService(context, input);
}

export function revokeGrant(context: Context, companyId: string, userId: string) {
  return revokeGrantService(context, { companyId, userId });
}

export function acceptInvitation(context: Context, token: string) {
  return acceptInvitationService(context, { token });
}

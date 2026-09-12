import { z } from "zod";

import { COMPANY_SCOPES } from "../../domain/scopes";
import { companyProcedure, userProcedure } from "../builders";
import {
  acceptInvitation,
  companyAccessRoleSchema,
  companyCreateSchema,
  companyPatchSchema,
  connectCompany,
  createCompany,
  getCompany,
  inviteToCompany,
  listCompanies,
  listMembers,
  revokeGrant,
  updateCompany,
} from "../services/companies.service";

const companyIdInput = z.object({ companyId: z.string().min(1) });
const companyScopeSchema = z.enum(COMPANY_SCOPES);

export const companiesRouter = {
  list: userProcedure
    .input(z.object({ view: z.enum(["all", "accounting"]).optional() }).optional())
    .handler(({ context, input }) => listCompanies(context, { view: input?.view ?? "all" })),

  create: userProcedure
    .input(companyCreateSchema)
    .handler(({ context, input }) => createCompany(context, input)),

  get: companyProcedure("company.read")
    .input(companyIdInput)
    .handler(async ({ context, input }) => {
      const result = await getCompany(context, { companyId: input.companyId });

      return {
        ...result,
        role: context.companyAccess.role,
        scopes: context.companyAccess.scopes,
      };
    }),

  update: companyProcedure("company.update")
    .input(z.object({ companyId: z.string().min(1), patch: companyPatchSchema }))
    .handler(({ context, input }) =>
      updateCompany(context, { companyId: input.companyId, patch: input.patch }),
    ),

  connect: userProcedure
    .input(z.object({ uniqueIdentifier: z.string().trim().min(1) }))
    .handler(({ context, input }) =>
      connectCompany(context, { uniqueIdentifier: input.uniqueIdentifier }),
    ),

  listMembers: companyProcedure("company.read")
    .input(companyIdInput)
    .handler(({ context, input }) => listMembers(context, { companyId: input.companyId })),

  invite: companyProcedure("company.manage_access")
    .input(
      companyIdInput.extend({
        email: z.string().email(),
        role: companyAccessRoleSchema,
        scopes: z.array(companyScopeSchema).optional(),
        expiresInDays: z.number().int().positive().max(365).optional(),
      }),
    )
    .handler(({ context, input }) => inviteToCompany(context, input)),

  revokeGrant: companyProcedure("company.manage_access")
    .input(companyIdInput.extend({ userId: z.string().min(1) }))
    .handler(({ context, input }) =>
      revokeGrant(context, { companyId: input.companyId, userId: input.userId }),
    ),

  acceptInvitation: userProcedure
    .input(z.object({ token: z.string().min(1) }))
    .handler(({ context, input }) => acceptInvitation(context, { token: input.token })),
};

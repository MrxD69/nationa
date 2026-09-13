import { z } from "zod";

import { agencyProcedure } from "../builders";
import {
  addAgencyMember,
  getCompanyDossier,
  getDocumentIntegrity,
  listAgencyMembers,
  removeAgencyMember,
  searchCompaniesForDossier,
  updateAgencyMember,
} from "../services/officer-trust.service";

const agencyIdSchema = z.string().min(1);
const agencyRoleSchema = z.enum(["officer", "supervisor", "admin"]);
const agencyMembershipStatusSchema = z.enum(["invited", "active", "suspended", "revoked"]);

// Officer trust: cross-agency dossier, document integrity, agency member admin.
export const officerTrustRouter = {
  dossierSearch: agencyProcedure("officer.dossier.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        query: z.string().min(2).max(120),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .handler(({ context, input }) => searchCompaniesForDossier(context, input)),

  dossier: agencyProcedure("officer.dossier.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        companyId: z.guid(),
      }),
    )
    .handler(({ context, input }) => getCompanyDossier(context, input)),

  documentIntegrity: agencyProcedure("officer.integrity.read")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        documentVersionId: z.guid(),
      }),
    )
    .handler(({ context, input }) => getDocumentIntegrity(context, input)),

  agencyMembers: agencyProcedure("agency.manage")
    .input(z.object({ agencyId: agencyIdSchema }))
    .handler(({ context, input }) => listAgencyMembers(context, input)),

  agencyMemberAdd: agencyProcedure("agency.manage")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        email: z.string().email().max(255),
        role: agencyRoleSchema,
      }),
    )
    .handler(({ context, input }) => addAgencyMember(context, input)),

  agencyMemberUpdate: agencyProcedure("agency.manage")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        userId: z.guid(),
        role: agencyRoleSchema.optional(),
        status: agencyMembershipStatusSchema.optional(),
      }),
    )
    .handler(({ context, input }) => updateAgencyMember(context, input)),

  agencyMemberRemove: agencyProcedure("agency.manage")
    .input(
      z.object({
        agencyId: agencyIdSchema,
        userId: z.guid(),
      }),
    )
    .handler(({ context, input }) => removeAgencyMember(context, input)),
};

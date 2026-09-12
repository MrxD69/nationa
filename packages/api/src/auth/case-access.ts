import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { persons, procedureTemplates, type Case } from "@nationa/db";

import type { Context } from "../context";
import type { CompanyPermission } from "../permissions";
import {
  assertAgencyAccess,
  assertAgencyPermission,
  assertCompanyAccess,
  assertCompanyPermission,
  requireUser,
} from "./access";

/**
 * Authorizes the current user for a case.
 *
 * - Company-backed cases delegate to {@link assertCompanyAccess}.
 * - Company-less cases (e.g. pre-incorporation "creation" procedures) allow the
 *   creator, the assignee, a person linked to the case, or an active member of
 *   the owning agency.
 */
export async function assertCaseAccess(context: Context, caseRecord: Case): Promise<void> {
  const user = requireUser(context);

  if (caseRecord.companyId) {
    await assertCompanyAccess(context, caseRecord.companyId);
    return;
  }

  if (caseRecord.createdByUserId === user.id || caseRecord.assignedToUserId === user.id) {
    return;
  }

  if (caseRecord.applicantPersonId) {
    const [person] = await context.db
      .select({ userId: persons.userId })
      .from(persons)
      .where(eq(persons.id, caseRecord.applicantPersonId))
      .limit(1);
    if (person?.userId === user.id) {
      return;
    }
  }

  const [template] = await context.db
    .select({ agencyId: procedureTemplates.agencyId })
    .from(procedureTemplates)
    .where(eq(procedureTemplates.id, caseRecord.templateId))
    .limit(1);

  if (template) {
    try {
      await assertAgencyAccess(context, template.agencyId);
      return;
    } catch {
      // fall through to the explicit FORBIDDEN below
    }
  }

  throw new ORPCError("FORBIDDEN", {
    message: "No access to this case",
    data: { caseId: caseRecord.id },
  });
}

export async function assertCasePermission(
  context: Context,
  caseRecord: Case,
  permission: CompanyPermission,
): Promise<void> {
  const user = requireUser(context);

  if (caseRecord.companyId) {
    await assertCompanyPermission(context, caseRecord.companyId, permission);
    return;
  }

  if (caseRecord.createdByUserId === user.id || caseRecord.assignedToUserId === user.id) {
    return;
  }

  if (caseRecord.applicantPersonId) {
    const [person] = await context.db
      .select({ userId: persons.userId })
      .from(persons)
      .where(eq(persons.id, caseRecord.applicantPersonId))
      .limit(1);
    if (person?.userId === user.id) {
      return;
    }
  }

  const [template] = await context.db
    .select({ agencyId: procedureTemplates.agencyId })
    .from(procedureTemplates)
    .where(eq(procedureTemplates.id, caseRecord.templateId))
    .limit(1);

  if (template) {
    try {
      await assertAgencyPermission(context, template.agencyId, "agency.read");
      return;
    } catch {
      // fall through to the explicit FORBIDDEN below
    }
  }

  throw new ORPCError("FORBIDDEN", {
    message: "No access to this case",
    data: { caseId: caseRecord.id },
  });
}

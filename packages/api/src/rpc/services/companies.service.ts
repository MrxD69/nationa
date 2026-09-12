import { ORPCError } from "@orpc/server";
import { z } from "zod";

import type { Company, NewCompany } from "@nationa/db";

import { requireUser } from "../../auth/access";
import { addressSchema } from "../../domain/extraction";
import { COMPANY_FIELD_KEYS, type CompanyFieldKey } from "../../domain/fields";
import type { CompanyScope } from "../../domain/scopes";
import { defaultScopesForRole } from "../../services/companyAccess";
import type { Context } from "../context";
import { findCompanyGrant } from "../repositories/access.repo";
import * as repo from "../repositories/companies.repo";

export const companyAccessRoleSchema = z.enum([
  "owner",
  "employee",
  "accountant",
  "accountant_assistant",
  "admin",
]);
export type CompanyAccessRole = z.infer<typeof companyAccessRoleSchema>;

const numericInput = z.union([z.string(), z.number()]);

export const companyFieldInputSchema = z.object({
  legalName: z.string().trim().min(1).max(500),
  legalNameAr: z.string().trim().max(500).nullish(),
  tradeName: z.string().trim().max(500).nullish(),
  brandName: z.string().trim().max(500).nullish(),
  legalForm: z.string().trim().max(200).nullish(),
  capitalAmount: numericInput.nullish(),
  currency: z.string().trim().max(10).nullish(),
  durationYears: numericInput.nullish(),
  publicationDate: z.string().nullish(),
  headquartersAddress: addressSchema.nullish(),
  activityAddress: addressSchema.nullish(),
  mainActivityLabel: z.string().trim().max(500).nullish(),
  mainActivityLabelAr: z.string().trim().max(500).nullish(),
  mainActivityCode: z.string().trim().max(100).nullish(),
  activityStartDate: z.string().nullish(),
  registryState: z.enum(["actif", "suspendu", "radie"]).nullish(),
  secondaryEstablishmentsCount: numericInput.nullish(),
  leasing: z.boolean().nullish(),
  hasPledge: z.boolean().nullish(),
  fiscalDefault: z.enum(["none", "months_12_24", "over_24_months", "unknown"]).nullish(),
  mentionDate: z.string().nullish(),
  uniqueIdentifier: z.string().trim().max(100).nullish(),
  internalManagementNumber: z.string().trim().max(100).nullish(),
  registryType: z.enum(["societe", "entreprise"]).nullish(),
  taxId: z.string().trim().max(100).nullish(),
});

export const companyPatchSchema = companyFieldInputSchema.partial();
export const companyCreateSchema = companyFieldInputSchema.extend({
  asPortfolio: z.boolean().optional(),
});

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyPatchInput = z.infer<typeof companyPatchSchema>;

export type InviteCompanyInput = {
  companyId: string;
  email: string;
  role: CompanyAccessRole;
  scopes?: CompanyScope[];
  expiresInDays?: number;
};

const ACCOUNTING_ROLES: CompanyAccessRole[] = ["accountant", "accountant_assistant"];
const DEFAULT_INVITE_DAYS = 7;

type CompanyFieldKind = "text" | "number" | "integer" | "boolean" | "date" | "address" | "enum";

const COMPANY_FIELD_KINDS: Record<CompanyFieldKey, CompanyFieldKind> = {
  legalName: "text",
  legalNameAr: "text",
  tradeName: "text",
  brandName: "text",
  legalForm: "text",
  capitalAmount: "number",
  currency: "text",
  durationYears: "integer",
  publicationDate: "date",
  headquartersAddress: "address",
  activityAddress: "address",
  mainActivityLabel: "text",
  mainActivityLabelAr: "text",
  mainActivityCode: "text",
  activityStartDate: "date",
  registryState: "enum",
  secondaryEstablishmentsCount: "integer",
  leasing: "boolean",
  hasPledge: "boolean",
  fiscalDefault: "enum",
  mentionDate: "date",
  uniqueIdentifier: "text",
  internalManagementNumber: "text",
  registryType: "enum",
  taxId: "text",
};

export async function userHasActiveCompany(
  context: Context,
  input: { userId: string },
): Promise<boolean> {
  const grant = await repo.findActiveGrantByUser(context.db, input.userId);
  return Boolean(grant);
}

export async function listCompanies(context: Context, input: { view?: "all" | "accounting" } = {}) {
  const user = requireUser(context);

  const rows = await repo.listCompanyEntries(context.db, {
    userId: user.id,
    accountingOnly: (input.view ?? "all") === "accounting",
    accountingRoles: ACCOUNTING_ROLES,
  });

  return rows.map((row) => ({ ...row.company, role: row.role, scopes: row.scopes }));
}

export async function createCompany(context: Context, input: CompanyCreateInput) {
  const user = requireUser(context);
  const columns = toCompanyColumns(input);

  const company = await repo.insertCompany(context.db, {
    ...columns,
    legalName: columns.legalName ?? input.legalName,
    status: "draft",
    createdByUserId: user.id,
  });

  if (!company) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create company" });
  }

  const role: CompanyAccessRole = input.asPortfolio ? "accountant" : "owner";
  const scopes = defaultScopesForRole(role);

  await repo.upsertCompanyGrant(
    context.db,
    {
      companyId: company.id,
      userId: user.id,
      role,
      scopes,
      status: "active",
      grantedBy: user.id,
    },
    new Date(),
  );

  return { companyId: company.id, role, scopes };
}

export async function getCompany(context: Context, input: { companyId: string }) {
  const company = await requireCompany(context, input.companyId);
  const provenance = await repo.listCompanyProvenance(context.db, input.companyId);

  return { company, provenance };
}

export async function updateCompany(
  context: Context,
  input: { companyId: string; patch: CompanyPatchInput },
) {
  const user = requireUser(context);
  const current = await requireCompany(context, input.companyId);
  const columns = toCompanyColumns(input.patch);

  const changed = COMPANY_FIELD_KEYS.filter((key) => {
    if (!(key in columns)) {
      return false;
    }
    const next = (columns as unknown as Record<string, unknown>)[key] ?? null;
    const previous = (current as unknown as Record<string, unknown>)[key] ?? null;
    return !valuesEqual(previous, next);
  });

  if (changed.length > 0) {
    await repo.updateCompanyColumns(context.db, input.companyId, columns);
    await repo.insertCompanyProvenance(
      context.db,
      changed.map((fieldKey) => ({
        subjectType: "company" as const,
        subjectId: input.companyId,
        fieldKey,
        sourceKind: "user" as const,
        enteredByUserId: user.id,
      })),
    );
  }

  const updated = await repo.findCompanyById(context.db, input.companyId);

  return { company: updated ?? current, changed };
}

export async function connectCompany(context: Context, input: { uniqueIdentifier: string }) {
  const user = requireUser(context);

  const company = await repo.findCompanyByUniqueIdentifier(context.db, input.uniqueIdentifier);

  if (!company) {
    throw new ORPCError("NOT_FOUND", {
      message: "No company matches this identifier",
      data: { uniqueIdentifier: input.uniqueIdentifier },
    });
  }

  const existing = await findCompanyGrant(context.db, company.id, user.id);

  const now = new Date();
  const isActive =
    existing &&
    existing.status === "active" &&
    existing.revokedAt === null &&
    (existing.expiresAt === null || existing.expiresAt.getTime() > now.getTime());

  if (existing && isActive) {
    return { companyId: company.id, grantStatus: existing.status, role: existing.role };
  }

  const role: CompanyAccessRole = "accountant";
  const scopes = defaultScopesForRole(role);

  await repo.upsertCompanyGrant(
    context.db,
    {
      companyId: company.id,
      userId: user.id,
      role,
      scopes,
      status: "active",
      grantedBy: user.id,
      revokedAt: null,
      expiresAt: null,
    },
    now,
  );

  return { companyId: company.id, grantStatus: "active" as const, role };
}

export async function listMembers(context: Context, input: { companyId: string }) {
  return repo.listCompanyMembers(context.db, input.companyId);
}

export async function inviteToCompany(context: Context, input: InviteCompanyInput) {
  const user = requireUser(context);
  const scopes =
    input.scopes && input.scopes.length > 0 ? input.scopes : defaultScopesForRole(input.role);
  const expiresInDays = input.expiresInDays ?? DEFAULT_INVITE_DAYS;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const invitation = await repo.insertInvitation(context.db, {
    token: createInvitationToken(),
    email: input.email.toLowerCase(),
    companyId: input.companyId,
    role: input.role,
    scopes,
    invitedBy: user.id,
    expiresAt,
  });

  if (!invitation) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create invitation" });
  }

  return {
    invitationId: invitation.id,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    role: invitation.role,
    scopes: invitation.scopes,
  };
}

export async function revokeGrant(context: Context, input: { companyId: string; userId: string }) {
  const updated = await repo.revokeAccessGrant(context.db, input.companyId, input.userId);

  if (!updated) {
    throw new ORPCError("NOT_FOUND", { message: "Access grant not found" });
  }

  return { userId: input.userId, status: updated.status, revokedAt: updated.revokedAt };
}

export async function acceptInvitation(context: Context, input: { token: string }) {
  const user = requireUser(context);

  if (!user.email) {
    throw new ORPCError("FORBIDDEN", {
      message: "Your account has no email address to match the invitation",
    });
  }

  const invitation = await repo.findInvitationByToken(context.db, input.token);

  if (!invitation) {
    throw new ORPCError("NOT_FOUND", { message: "Invitation not found" });
  }

  if (invitation.expiresAt.getTime() <= Date.now()) {
    throw new ORPCError("BAD_REQUEST", { message: "Invitation has expired" });
  }

  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ORPCError("FORBIDDEN", {
      message: "Invitation was issued to a different email address",
    });
  }

  const now = new Date();

  await repo.upsertCompanyGrant(
    context.db,
    {
      companyId: invitation.companyId,
      userId: user.id,
      role: invitation.role,
      scopes: invitation.scopes,
      status: "active",
      grantedBy: invitation.invitedBy,
      grantedAt: now,
      revokedAt: null,
    },
    now,
  );

  if (!invitation.acceptedAt) {
    await repo.markInvitationAccepted(context.db, invitation.id, now);
  }

  return { companyId: invitation.companyId, role: invitation.role, grantStatus: "active" as const };
}

async function requireCompany(context: Context, companyId: string): Promise<Company> {
  const company = await repo.findCompanyById(context.db, companyId);

  if (!company) {
    throw new ORPCError("NOT_FOUND", { message: "Company not found" });
  }

  return company;
}

function toCompanyColumns(patch: CompanyPatchInput): Partial<NewCompany> {
  const columns: Partial<NewCompany> = {};

  for (const key of COMPANY_FIELD_KEYS) {
    const raw = (patch as unknown as Record<string, unknown>)[key];
    if (raw === undefined) {
      continue;
    }
    const normalized = normalizeFieldValue(key, raw);
    if (key === "legalName" && (normalized === null || normalized === "")) {
      continue;
    }
    (columns as unknown as Record<string, unknown>)[key] = normalized;
  }

  return columns;
}

function normalizeFieldValue(key: CompanyFieldKey, value: unknown): unknown {
  switch (COMPANY_FIELD_KINDS[key]) {
    case "text":
    case "date":
    case "enum":
      return normalizeText(value);
    case "number":
      return normalizeNumberText(value);
    case "integer":
      return normalizeInteger(value);
    case "boolean":
      if (value === null || value === undefined) {
        return null;
      }
      return typeof value === "boolean" ? value : Boolean(value);
    case "address":
      return normalizeAddress(value);
  }
}

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumberText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? String(num) : null;
}

function normalizeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

function normalizeAddress(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? { raw: trimmed } : null;
  }
  return value;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function createInvitationToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

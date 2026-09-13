import type {
  AgencyPermission,
  CompanyPermission,
  Permission,
  PermissionScope,
  PlatformPermission,
} from "./catalog";

export type CompanyRole = "owner" | "employee" | "accountant" | "accountant_assistant" | "admin";
export type AgencyRole = "officer" | "supervisor" | "admin";
export type PlatformRole = "owner" | "accountant" | "officer" | "admin";

export type RoleForScope<S extends PermissionScope> = S extends "company"
  ? CompanyRole
  : S extends "agency"
    ? AgencyRole
    : PlatformRole;

export const ALL_COMPANY_PERMISSIONS = [
  "company.read",
  "company.update",
  "company.manage_access",
  "company.delete",
  "documents.read",
  "documents.write",
  "documents.delete",
  "documents.extract",
  "documents.generate",
  "cases.read",
  "cases.write",
  "cases.submit",
  "cases.cancel",
  "checks.read",
  "checks.run",
  "checks.resolve",
  "submissions.read",
  "submissions.create",
  "submissions.resubmit",
  "invoices.read",
  "invoices.write",
  "invoices.verify",
  "filings.read",
  "filings.write",
  "filings.submit",
  "ai.use",
  "billing.read",
  "billing.pay",
  "notifications.manage",
  "activity.read",
] as const satisfies readonly CompanyPermission[];

export const ALL_AGENCY_PERMISSIONS = [
  "agency.read",
  "agency.manage",
  "officer.queue.read",
  "officer.review.read",
  "officer.review.decide",
  "officer.document.read",
  "officer.company_patterns.read",
  "officer.analytics.read",
  "officer.queue.assign",
  "officer.deficiency.manage",
  "officer.conditions.read",
  "officer.registry.read",
  "officer.dossier.read",
  "officer.integrity.read",
  "officer.ai.use",
] as const satisfies readonly AgencyPermission[];

export const ALL_PLATFORM_PERMISSIONS = [
  "platform.admin",
] as const satisfies readonly PlatformPermission[];

export const ALL_PERMISSIONS = [
  ...ALL_COMPANY_PERMISSIONS,
  ...ALL_AGENCY_PERMISSIONS,
  ...ALL_PLATFORM_PERMISSIONS,
] as const satisfies readonly Permission[];

const AGENCY_OFFICER_PERMISSIONS = [
  "agency.read",
  "officer.queue.read",
  "officer.review.read",
  "officer.review.decide",
  "officer.document.read",
  "officer.company_patterns.read",
  "officer.queue.assign",
  "officer.deficiency.manage",
  "officer.conditions.read",
  "officer.registry.read",
  "officer.dossier.read",
  "officer.integrity.read",
  "officer.ai.use",
] as const satisfies readonly AgencyPermission[];

export const COMPANY_ROLE_PERMISSIONS = {
  owner: ALL_COMPANY_PERMISSIONS,
  admin: ALL_COMPANY_PERMISSIONS,
  accountant: [
    "company.read",
    "company.update",
    "company.manage_access",
    "documents.read",
    "documents.write",
    "documents.delete",
    "documents.extract",
    "documents.generate",
    "cases.read",
    "cases.write",
    "cases.submit",
    "cases.cancel",
    "checks.read",
    "checks.run",
    "checks.resolve",
    "submissions.read",
    "submissions.create",
    "submissions.resubmit",
    "invoices.read",
    "invoices.write",
    "invoices.verify",
    "filings.read",
    "filings.write",
    "filings.submit",
    "ai.use",
    "billing.read",
    "activity.read",
  ] as const satisfies readonly CompanyPermission[],
  accountant_assistant: [
    "company.read",
    "documents.read",
    "documents.write",
    "documents.generate",
    "cases.read",
    "cases.write",
    "checks.read",
    "submissions.read",
    "invoices.read",
    "invoices.write",
    "filings.read",
    "ai.use",
    "activity.read",
  ] as const satisfies readonly CompanyPermission[],
  employee: [
    "company.read",
    "documents.read",
    "documents.write",
    "cases.read",
    "checks.read",
    "submissions.read",
    "ai.use",
  ] as const satisfies readonly CompanyPermission[],
} as const satisfies Record<CompanyRole, readonly CompanyPermission[]>;

export const AGENCY_ROLE_PERMISSIONS = {
  officer: AGENCY_OFFICER_PERMISSIONS,
  supervisor: [
    ...AGENCY_OFFICER_PERMISSIONS,
    "officer.analytics.read",
    "agency.manage",
  ] as const satisfies readonly AgencyPermission[],
  admin: ALL_AGENCY_PERMISSIONS,
} as const satisfies Record<AgencyRole, readonly AgencyPermission[]>;

export const PLATFORM_ROLE_PERMISSIONS = {
  owner: [] as const satisfies readonly PlatformPermission[],
  accountant: [] as const satisfies readonly PlatformPermission[],
  officer: [] as const satisfies readonly PlatformPermission[],
  admin: ALL_PERMISSIONS,
} as const satisfies Record<PlatformRole, readonly Permission[]>;

export const FULL_ACCESS_COMPANY_ROLES: readonly CompanyRole[] = ["owner", "admin"];

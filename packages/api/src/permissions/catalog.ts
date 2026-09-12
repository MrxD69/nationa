import {
  AGENCY_ROLE_PERMISSIONS,
  COMPANY_ROLE_PERMISSIONS,
  PLATFORM_ROLE_PERMISSIONS,
} from "./roles";

export type PermissionScope = "company" | "agency" | "platform";

export type PermissionDescriptor = {
  readonly scope: PermissionScope;
  readonly description: string;
};

export const PERMISSIONS = {
  // Company
  "company.read": { scope: "company", description: "View company profile" },
  "company.update": { scope: "company", description: "Update company profile" },
  "company.manage_access": { scope: "company", description: "Manage company access" },
  "company.delete": { scope: "company", description: "Delete a company" },
  "documents.read": { scope: "company", description: "View documents" },
  "documents.write": { scope: "company", description: "Create and update documents" },
  "documents.delete": { scope: "company", description: "Delete documents" },
  "documents.extract": { scope: "company", description: "Run document extraction" },
  "documents.generate": { scope: "company", description: "Generate documents" },
  "cases.read": { scope: "company", description: "View cases" },
  "cases.write": { scope: "company", description: "Create and update cases" },
  "cases.submit": { scope: "company", description: "Submit a case" },
  "cases.cancel": { scope: "company", description: "Cancel a case" },
  "checks.read": { scope: "company", description: "View check runs and findings" },
  "checks.run": { scope: "company", description: "Run checks" },
  "checks.resolve": { scope: "company", description: "Resolve findings" },
  "submissions.read": { scope: "company", description: "View submissions" },
  "submissions.create": { scope: "company", description: "Create submissions" },
  "submissions.resubmit": { scope: "company", description: "Resubmit a submission" },
  "invoices.read": { scope: "company", description: "View invoices" },
  "invoices.write": { scope: "company", description: "Create and update invoices" },
  "invoices.verify": { scope: "company", description: "Verify invoices" },
  "filings.read": { scope: "company", description: "View filings" },
  "filings.write": { scope: "company", description: "Create and update filings" },
  "filings.submit": { scope: "company", description: "Submit filings" },
  "ai.use": { scope: "company", description: "Use AI features" },
  "billing.read": { scope: "company", description: "View billing" },
  "billing.pay": { scope: "company", description: "Pay billing items" },
  "notifications.manage": { scope: "company", description: "Manage notifications" },
  "activity.read": { scope: "company", description: "View company activity" },

  // Agency
  "agency.read": { scope: "agency", description: "View agency" },
  "agency.manage": { scope: "agency", description: "Manage agency" },
  "officer.queue.read": { scope: "agency", description: "View officer queue" },
  "officer.review.read": { scope: "agency", description: "View officer reviews" },
  "officer.review.decide": { scope: "agency", description: "Decide officer reviews" },
  "officer.document.read": { scope: "agency", description: "Read officer documents" },
  "officer.company_patterns.read": { scope: "agency", description: "View company patterns" },
  "officer.analytics.read": { scope: "agency", description: "View officer analytics" },

  // Platform
  "platform.admin": { scope: "platform", description: "Platform administration" },
} as const satisfies Record<string, PermissionDescriptor>;

export type Permission = keyof typeof PERMISSIONS;

export type PermissionForScope<S extends PermissionScope> = {
  [K in Permission]: (typeof PERMISSIONS)[K]["scope"] extends S ? K : never;
}[Permission];

export type CompanyPermission = PermissionForScope<"company">;
export type AgencyPermission = PermissionForScope<"agency">;
export type PlatformPermission = PermissionForScope<"platform">;

const ROLE_MATRICES: Record<PermissionScope, readonly (readonly Permission[])[]> = {
  company: Object.values(COMPANY_ROLE_PERMISSIONS),
  agency: Object.values(AGENCY_ROLE_PERMISSIONS),
  platform: Object.values(PLATFORM_ROLE_PERMISSIONS),
};

export function assertPermissionCoverage(): void {
  const missing: Permission[] = [];

  for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
    const scope = PERMISSIONS[permission].scope;
    const covered = ROLE_MATRICES[scope].some((permissions) => permissions.includes(permission));
    if (!covered) {
      missing.push(permission);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Permission coverage check failed; not granted to any role: ${missing.join(", ")}`,
    );
  }
}

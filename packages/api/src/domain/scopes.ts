export const COMPANY_SCOPES = [
  "company.read",
  "company.update",
  "company.manage_access",
  "documents.read",
  "documents.write",
  "documents.extract",
  "cases.read",
  "cases.write",
  "filings.read",
  "filings.write",
  "invoices.read",
  "invoices.write",
] as const;

export type CompanyScope = (typeof COMPANY_SCOPES)[number];

import type { AppDir, CompanyNavItem, RailItem } from "~/types/shell";

export const COMPANY_QUERY_KEY = "companyId";

export const COMPANY_AWARE_PREFIXES: readonly string[] = [
  "/cases",
  "/actions",
  "/findings",
  "/docgen",
];

export const RAIL_ITEMS: RailItem[] = [
  {
    key: "companies",
    icon: "i-tabler-building-skyscraper",
    labelKey: "shell.rail.companies",
    to: "/companies",
  },
  {
    key: "submissions",
    icon: "i-tabler-send",
    labelKey: "shell.rail.submissions",
    to: "/submissions",
  },
  {
    key: "actions",
    icon: "i-tabler-list-check",
    labelKey: "shell.rail.actions",
    to: "/actions",
  },
  {
    key: "notifications",
    icon: "i-tabler-bell",
    labelKey: "shell.rail.notifications",
    action: "notifications",
  },
  {
    key: "search",
    icon: "i-tabler-search",
    labelKey: "shell.rail.search",
    action: "search",
  },
  {
    key: "settings",
    icon: "i-tabler-settings",
    labelKey: "shell.rail.settings",
    to: "/settings",
  },
  {
    key: "help",
    icon: "i-tabler-help-circle",
    labelKey: "shell.rail.help",
    to: "/help",
  },
];

export const COMPANY_TABS: CompanyNavItem[] = [
  {
    key: "overview",
    icon: "i-tabler-layout-dashboard",
    labelKey: "shell.company.tabs.overview",
    to: "/companies/:companyId",
    priority: 10,
    matchPrefixes: ["/companies/:companyId"],
  },
  {
    key: "cases",
    icon: "i-tabler-folders",
    labelKey: "shell.company.tabs.cases",
    to: "/cases",
    priority: 30,
    matchPrefixes: ["/cases"],
  },
  {
    key: "papers",
    icon: "i-tabler-files",
    labelKey: "shell.company.tabs.papers",
    to: "/companies/:companyId/documents",
    priority: 40,
    matchPrefixes: ["/companies/:companyId/documents"],
  },
  {
    key: "invoices",
    icon: "i-tabler-file-invoice",
    labelKey: "shell.company.tabs.invoices",
    to: "/companies/:companyId/invoices",
    priority: 50,
    matchPrefixes: ["/companies/:companyId/invoices"],
  },
  {
    key: "filings",
    icon: "i-tabler-file-text",
    labelKey: "shell.company.tabs.filings",
    to: "/companies/:companyId/filings",
    priority: 60,
    matchPrefixes: ["/companies/:companyId/filings"],
  },
  {
    key: "checks",
    icon: "i-tabler-shield-check",
    labelKey: "shell.company.tabs.checks",
    to: "/findings",
    priority: 70,
    matchPrefixes: ["/findings"],
  },
  {
    key: "docgen",
    icon: "i-tabler-file-plus",
    labelKey: "shell.company.tabs.docgen",
    to: "/docgen",
    priority: 80,
    matchPrefixes: ["/docgen"],
  },
];

export function dirForLocale(locale: string): AppDir {
  return locale.startsWith("ar") ? "rtl" : "ltr";
}

export function isCompanyAwarePath(path: string): boolean {
  return COMPANY_AWARE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Resolves a route template that may contain the `:companyId` token.
 *
 * When `companyId` is a non-empty string, every `:companyId` occurrence is
 * replaced with it. When `companyId` is null, the `/:companyId` segment is
 * stripped so the caller receives a company-less path and can decide what to do
 * with it (e.g. disable the link).
 */
export function resolveCompanyPath(to: string, companyId: string | null): string {
  if (companyId) {
    return to.replaceAll(":companyId", companyId);
  }
  return to.replaceAll("/:companyId", "").replaceAll(":companyId", "");
}

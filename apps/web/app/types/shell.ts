export type AppDir = "ltr" | "rtl";
export type RailAction = "notifications" | "search" | "language" | "theme";

export interface RailItem {
  key: string;
  icon: string; // iconify name, e.g. "i-tabler-building-skyscraper"
  labelKey: string; // i18n key, e.g. "shell.rail.companies"
  to?: string; // route path when it navigates
  action?: RailAction; // behavior when it does not navigate
}

export interface CompanyNavItem {
  key: string; // "overview" | "papers" | "invoices" | "filings" | "actions" | "cases" | "checks" | "docgen"
  labelKey: string; // "shell.company.tabs.<key>"
  to: string; // may contain the token ":companyId"
  priority: number; // lower = more prominent
  matchPrefixes: string[]; // route prefixes that mark this tab active
}

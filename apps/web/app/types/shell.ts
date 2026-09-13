export type AppDir = "ltr" | "rtl";
export type RailSection = "workspace" | "account";

export interface RailItem {
  key: string;
  icon: string; // iconify name, e.g. "i-tabler-building-skyscraper"
  labelKey: string; // i18n key, e.g. "shell.rail.companies"
  label?: string; // pre-resolved label override (e.g. the owner's company name)
  to: string; // route path this item navigates to
  section: RailSection; // group heading this item sits under
  badgeCount?: number; // reco count badge (actions item only, hidden when 0/undefined)
}

export interface CompanyNavItem {
  key: string; // "overview" | "papers" | "invoices" | "filings" | "actions" | "cases" | "checks" | "docgen"
  icon: string; // iconify name, e.g. "i-tabler-layout-dashboard"
  labelKey: string; // "shell.company.tabs.<key>"
  to: string; // may contain the token ":companyId"
  priority: number; // lower = more prominent
  matchPrefixes: string[]; // route prefixes that mark this tab active
}

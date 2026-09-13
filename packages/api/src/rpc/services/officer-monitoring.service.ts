import { normalizeText, parseDate, parseNumber } from "../../checks/compare";
import {
  DEADLINE_BUCKET_ORDER,
  deadlineBucket,
  daysUntil,
  resolveObligationDeadline,
} from "../../domain/officer-sla";
import type { Context } from "../context";
import * as repo from "../repositories/officer-monitoring.repo";

type ConditionBucket = "overdue" | "due_soon" | "upcoming" | "unknown";

type ConditionRow = {
  companyId: string;
  companyName: string;
  companyNameAr: string | null;
  uniqueIdentifier: string | null;
  companyLegalForm: string | null;
  obligationId: string;
  obligationCode: string;
  obligationNameFr: string;
  obligationNameAr: string | null;
  periodicity: string;
  agencyId: string;
  dueDate: string | null;
  daysRemaining: number | null;
  bucket: ConditionBucket;
  penaltySummary: string | null;
  legalBasis: string | null;
  registryState: string;
  fiscalDefault: string;
  lastFinancialStatementsDate: string | null;
  companyRegistryType: string | null;
};

type ConditionCounts = {
  overdue: number;
  dueSoon: number;
  upcoming: number;
  unknown: number;
  companies: number;
};

const MAX_CROSS_ROWS = 20_000;
const MAX_COMPANIES = 1000;
const REDUCED_COMPANIES = 400;
const DEFAULT_PAGE = 50;
const MAX_PAGE = 200;
const STALE_FINANCIAL_STATEMENT_MONTHS = 18;

type ConditionSet = { rows: ConditionRow[]; truncated: boolean };

function encodeCursor(offset: number): string {
  return String(offset);
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function resolvePageLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return DEFAULT_PAGE;
  }
  return Math.min(Math.max(1, Math.trunc(limit)), MAX_PAGE);
}

function compareConditionRows(a: ConditionRow, b: ConditionRow): number {
  const bucketDiff = DEADLINE_BUCKET_ORDER[a.bucket] - DEADLINE_BUCKET_ORDER[b.bucket];
  if (bucketDiff !== 0) {
    return bucketDiff;
  }
  if (a.daysRemaining === null && b.daysRemaining !== null) {
    return 1;
  }
  if (a.daysRemaining !== null && b.daysRemaining === null) {
    return -1;
  }
  if (a.daysRemaining !== null && b.daysRemaining !== null && a.daysRemaining !== b.daysRemaining) {
    return a.daysRemaining - b.daysRemaining;
  }
  const nameDiff = a.companyName.localeCompare(b.companyName, "fr");
  if (nameDiff !== 0) {
    return nameDiff;
  }
  return a.obligationCode.localeCompare(b.obligationCode);
}

async function buildConditionSet(context: Context, agencyId: string): Promise<ConditionSet> {
  const now = new Date();
  const [obligations, agencyCompanies] = await Promise.all([
    repo.listActiveObligations(context.db, agencyId),
    repo.listAgencyCompanies(context.db, agencyId, MAX_COMPANIES),
  ]);

  let boundedCompanies = agencyCompanies;
  let truncated = false;
  if (
    obligations.length * agencyCompanies.length > MAX_CROSS_ROWS &&
    agencyCompanies.length > REDUCED_COMPANIES
  ) {
    boundedCompanies = agencyCompanies.slice(0, REDUCED_COMPANIES);
    truncated = true;
  }

  const rows: ConditionRow[] = [];
  for (const company of boundedCompanies) {
    for (const obligation of obligations) {
      const dueDate = resolveObligationDeadline(obligation.deadlineRule, now, {
        personType: company.registryType === "entreprise" ? "physical" : "moral",
      });
      rows.push({
        companyId: company.id,
        companyName: company.legalName,
        companyNameAr: company.legalNameAr,
        uniqueIdentifier: company.uniqueIdentifier,
        companyLegalForm: company.legalForm,
        obligationId: obligation.id,
        obligationCode: obligation.code,
        obligationNameFr: obligation.nameFr,
        obligationNameAr: obligation.nameAr,
        periodicity: obligation.periodicity,
        agencyId: obligation.agencyId,
        dueDate: dueDate ? dueDate.toISOString() : null,
        daysRemaining: daysUntil(dueDate, now),
        bucket: deadlineBucket(dueDate, now),
        penaltySummary: obligation.penaltySummary,
        legalBasis: obligation.legalBasis,
        registryState: company.registryState,
        fiscalDefault: company.fiscalDefault,
        lastFinancialStatementsDate: company.lastFinancialStatementsDate,
        companyRegistryType: company.registryType,
      });
    }
  }

  rows.sort(compareConditionRows);
  return { rows, truncated };
}

function countBuckets(rows: ConditionRow[]): ConditionCounts {
  const counts: ConditionCounts = {
    overdue: 0,
    dueSoon: 0,
    upcoming: 0,
    unknown: 0,
    companies: 0,
  };
  const companyIds = new Set<string>();
  for (const row of rows) {
    companyIds.add(row.companyId);
    if (row.bucket === "overdue") {
      counts.overdue += 1;
    } else if (row.bucket === "due_soon") {
      counts.dueSoon += 1;
    } else if (row.bucket === "upcoming") {
      counts.upcoming += 1;
    } else {
      counts.unknown += 1;
    }
  }
  counts.companies = companyIds.size;
  return counts;
}

export async function listConditions(
  context: Context,
  input: {
    agencyId: string;
    companyId?: string;
    bucket?: ConditionBucket;
    limit?: number;
    cursor?: string;
  },
) {
  const { rows, truncated } = await buildConditionSet(context, input.agencyId);
  const filtered = rows.filter((row) => {
    if (input.companyId && row.companyId !== input.companyId) {
      return false;
    }
    if (input.bucket && row.bucket !== input.bucket) {
      return false;
    }
    return true;
  });

  const counts = countBuckets(filtered);
  const limit = resolvePageLimit(input.limit);
  const offset = decodeCursor(input.cursor);
  const items = filtered.slice(offset, offset + limit);
  const hasMore = offset + limit < filtered.length;

  return {
    items,
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    counts,
    truncated,
  };
}

export async function getConditionsSummary(context: Context, input: { agencyId: string }) {
  const { rows } = await buildConditionSet(context, input.agencyId);
  const counts = countBuckets(rows);
  const overdue = rows.filter((row) => row.bucket === "overdue");

  const overdueCompanies = new Set(overdue.map((row) => row.companyId));

  const byObligation = new Map<
    string,
    { obligationCode: string; nameFr: string; nameAr: string | null; overdue: number }
  >();
  for (const row of overdue) {
    const entry = byObligation.get(row.obligationCode) ?? {
      obligationCode: row.obligationCode,
      nameFr: row.obligationNameFr,
      nameAr: row.obligationNameAr,
      overdue: 0,
    };
    entry.overdue += 1;
    byObligation.set(row.obligationCode, entry);
  }

  const topObligations = [...byObligation.values()]
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 5);

  return {
    counts,
    overdueCompanies: overdueCompanies.size,
    topObligations,
  };
}

// ---------------------------------------------------------------------------
// Registry flags
// ---------------------------------------------------------------------------

const REGISTRY_FLAG_KINDS = [
  "duplicate_identifier",
  "duplicate_name",
  "capital_mismatch",
  "legal_form_mismatch",
  "stale_active",
  "fiscal_default",
  "missing_financial_statements",
  "suspended_with_open_submission",
] as const;

type RegistryFlagKind = (typeof REGISTRY_FLAG_KINDS)[number];
type FlagSeverity = "warning" | "error" | "info";

type RegistryFlag = {
  id: string;
  kind: RegistryFlagKind;
  severity: FlagSeverity;
  companyId: string;
  companyName: string;
  companyNameAr: string | null;
  uniqueIdentifier: string | null;
  title: string;
  detail: string;
  evidence: Array<{ label: string; value: string }>;
};

type OfficerCompany = Awaited<ReturnType<typeof repo.listAllActiveCompanies>>[number];
type OfficerSnapshot = Awaited<ReturnType<typeof repo.listLatestSnapshotsForCompanies>>[number];

const SEVERITY_ORDER: Record<FlagSeverity, number> = { error: 0, warning: 1, info: 2 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeIdentifier(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function monthsAgo(now: Date, months: number): Date {
  const date = new Date(now.getTime());
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

function readCapital(snapshot: unknown): { value: number; display: string } | null {
  if (!isRecord(snapshot)) {
    return null;
  }
  const raw = snapshot.capitalAmount ?? snapshot.capital;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? { value: raw, display: String(raw) } : null;
  }
  if (typeof raw === "string") {
    const parsed = parseNumber(raw);
    return parsed === null ? null : { value: parsed, display: raw.trim() };
  }
  return null;
}

function readLegalForm(snapshot: unknown): string | null {
  if (!isRecord(snapshot)) {
    return null;
  }
  const raw = snapshot.legalForm;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pushFlag(map: Map<string, OfficerCompany[]>, key: string | null, company: OfficerCompany) {
  if (!key) {
    return;
  }
  const group = map.get(key) ?? [];
  group.push(company);
  map.set(key, group);
}

function makeFlag(input: {
  kind: RegistryFlagKind;
  severity: FlagSeverity;
  company: OfficerCompany;
  title: string;
  detail: string;
  evidence: Array<{ label: string; value: string }>;
}): RegistryFlag {
  return {
    id: `${input.kind}:${input.company.id}`,
    kind: input.kind,
    severity: input.severity,
    companyId: input.company.id,
    companyName: input.company.legalName,
    companyNameAr: input.company.legalNameAr,
    uniqueIdentifier: input.company.uniqueIdentifier,
    title: input.title,
    detail: input.detail,
    evidence: input.evidence,
  };
}

async function buildRegistryFlags(context: Context, agencyId: string): Promise<RegistryFlag[]> {
  const now = new Date();

  let companyRows = await repo.listAgencyCompanies(context.db, agencyId, MAX_COMPANIES);
  if (companyRows.length === 0) {
    companyRows = await repo.listAllActiveCompanies(context.db, MAX_COMPANIES);
  }

  const companyIds = companyRows.map((company) => company.id);
  const [snapshots, openCompanyIds] = await Promise.all([
    repo.listLatestSnapshotsForCompanies(context.db, companyIds),
    repo.listOpenSubmissionCompanyIds(context.db, agencyId),
  ]);

  const latestSnapshot = new Map<string, OfficerSnapshot>();
  for (const snapshot of snapshots) {
    if (!latestSnapshot.has(snapshot.companyId)) {
      latestSnapshot.set(snapshot.companyId, snapshot);
    }
  }
  const openIds = new Set(openCompanyIds);

  const flags: RegistryFlag[] = [];

  // duplicate_identifier
  const byIdentifier = new Map<string, OfficerCompany[]>();
  const byName = new Map<string, OfficerCompany[]>();
  for (const company of companyRows) {
    pushFlag(byIdentifier, normalizeIdentifier(company.uniqueIdentifier), company);
    pushFlag(byName, normalizeText(company.legalName), company);
  }

  for (const group of byIdentifier.values()) {
    if (group.length < 2) {
      continue;
    }
    for (const company of group) {
      flags.push(
        makeFlag({
          kind: "duplicate_identifier",
          severity: "error",
          company,
          title: "Identifiant unique en double",
          detail: `L'identifiant « ${company.uniqueIdentifier ?? "—"} » est utilisé par ${group.length} sociétés.`,
          evidence: [{ label: "Identifiant unique", value: company.uniqueIdentifier ?? "—" }],
        }),
      );
    }
  }

  // duplicate_name
  for (const group of byName.values()) {
    if (group.length < 2) {
      continue;
    }
    for (const company of group) {
      flags.push(
        makeFlag({
          kind: "duplicate_name",
          severity: "warning",
          company,
          title: "Dénomination sociale en double",
          detail: `La dénomination « ${company.legalName} » apparaît pour ${group.length} sociétés.`,
          evidence: [{ label: "Dénomination sociale", value: company.legalName }],
        }),
      );
    }
  }

  for (const company of companyRows) {
    const snapshot = latestSnapshot.get(company.id);
    const snapshotData = snapshot?.snapshot ?? null;
    const currency = company.currency ?? "TND";

    // capital_mismatch
    const capital = readCapital(snapshotData);
    if (capital) {
      const registered = parseNumber(company.capitalAmount);
      if (registered !== null && Math.abs(registered - capital.value) > 1) {
        flags.push(
          makeFlag({
            kind: "capital_mismatch",
            severity: "error",
            company,
            title: "Capital social divergent",
            detail: `Le capital enregistré (« ${company.capitalAmount ?? "—"} ${currency} ») ne correspond pas à celui de l'extrait du registre (« ${capital.display} ${currency} »).`,
            evidence: [
              { label: "Capital enregistré", value: `${company.capitalAmount ?? "—"} ${currency}` },
              {
                label: "Capital selon l'extrait du registre",
                value: `${capital.display} ${currency}`,
              },
            ],
          }),
        );
      }
    }

    // legal_form_mismatch
    const snapshotLegalForm = readLegalForm(snapshotData);
    const registeredLegalForm = normalizeText(company.legalForm);
    const snapshotLegalFormNormalized = normalizeText(snapshotLegalForm);
    if (
      snapshotLegalForm &&
      snapshotLegalFormNormalized &&
      snapshotLegalFormNormalized !== registeredLegalForm
    ) {
      flags.push(
        makeFlag({
          kind: "legal_form_mismatch",
          severity: "warning",
          company,
          title: "Forme juridique divergente",
          detail: `La forme juridique enregistrée (« ${company.legalForm ?? "—"} ») diffère de celle de l'extrait du registre (« ${snapshotLegalForm} »).`,
          evidence: [
            { label: "Forme juridique enregistrée", value: company.legalForm ?? "—" },
            { label: "Forme juridique selon l'extrait du registre", value: snapshotLegalForm },
          ],
        }),
      );
    }

    // missing_financial_statements / stale_active (mutually exclusive)
    if (company.registryState === "actif") {
      if (!company.lastFinancialStatementsDate) {
        flags.push(
          makeFlag({
            kind: "missing_financial_statements",
            severity: "warning",
            company,
            title: "États financiers manquants",
            detail: "La société est active, mais aucun dépôt d'états financiers n'est enregistré.",
            evidence: [{ label: "États financiers", value: "Aucun dépôt enregistré" }],
          }),
        );
      } else {
        const statementsDate = parseDate(company.lastFinancialStatementsDate);
        if (
          statementsDate &&
          statementsDate.getTime() < monthsAgo(now, STALE_FINANCIAL_STATEMENT_MONTHS).getTime()
        ) {
          flags.push(
            makeFlag({
              kind: "stale_active",
              severity: "warning",
              company,
              title: "États financiers anciens",
              detail: `La société est active, mais ses derniers états financiers datent du ${company.lastFinancialStatementsDate} (plus de ${STALE_FINANCIAL_STATEMENT_MONTHS} mois).`,
              evidence: [
                { label: "Derniers états financiers", value: company.lastFinancialStatementsDate },
              ],
            }),
          );
        }
      }
    }

    // fiscal_default
    if (company.fiscalDefault === "months_12_24" || company.fiscalDefault === "over_24_months") {
      const fiscalLabel =
        company.fiscalDefault === "months_12_24" ? "plus de 12 mois" : "plus de 24 mois";
      flags.push(
        makeFlag({
          kind: "fiscal_default",
          severity: "error",
          company,
          title: "Défaut fiscal déclaré",
          detail: `La société est en situation de défaut fiscal depuis ${fiscalLabel}.`,
          evidence: [{ label: "Situation fiscale", value: fiscalLabel }],
        }),
      );
    }

    // suspended_with_open_submission
    const registryInactive =
      company.registryState === "suspendu" || company.registryState === "radie";
    const statusInactive = company.status === "suspended" || company.status === "radiated";
    if ((registryInactive || statusInactive) && openIds.has(company.id)) {
      flags.push(
        makeFlag({
          kind: "suspended_with_open_submission",
          severity: "warning",
          company,
          title: "Société suspendue avec une déclaration en cours",
          detail:
            "La société n'est plus active au registre, mais une déclaration est encore en cours de traitement.",
          evidence: [
            { label: "État au registre", value: company.registryState },
            { label: "Déclaration en cours", value: "Oui" },
          ],
        }),
      );
    }
  }

  flags.sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    const nameDiff = a.companyName.localeCompare(b.companyName, "fr");
    if (nameDiff !== 0) {
      return nameDiff;
    }
    return a.kind.localeCompare(b.kind);
  });

  return flags;
}

export async function listRegistryFlags(
  context: Context,
  input: {
    agencyId: string;
    kind?: RegistryFlagKind;
    severity?: FlagSeverity;
    limit?: number;
    cursor?: string;
  },
) {
  const flags = await buildRegistryFlags(context, input.agencyId);

  const counts: Record<string, number> = {};
  for (const kind of REGISTRY_FLAG_KINDS) {
    counts[kind] = 0;
  }
  for (const flag of flags) {
    counts[flag.kind] = (counts[flag.kind] ?? 0) + 1;
  }

  const filtered = flags.filter((flag) => {
    if (input.kind && flag.kind !== input.kind) {
      return false;
    }
    if (input.severity && flag.severity !== input.severity) {
      return false;
    }
    return true;
  });

  const limit = resolvePageLimit(input.limit);
  const offset = decodeCursor(input.cursor);
  const items = filtered.slice(offset, offset + limit);
  const hasMore = offset + limit < filtered.length;

  return {
    items,
    counts,
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  };
}

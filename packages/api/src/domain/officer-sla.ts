// Officer SLA + deadline helpers.
//
// Pure, dependency-free date math shared by officer queue/deficiency/monitoring
// routines. No DB, no service imports.
//
// AGENCY_SLA_HOURS below are configurable *service targets* used for dashboard
// sorting / "at risk" highlighting. They are NOT legal claims about statutory
// processing times and should be tuned per agency agreement.

export type SlaBucket = "on_time" | "at_risk" | "breached";
export type DeadlineBucket = "overdue" | "due_soon" | "upcoming" | "unknown";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Service-level target (in hours) from submission to first officer decision.
 * Configurable targets only — not legal claims.
 */
const DEFAULT_SLA_HOURS = 72;

export const AGENCY_SLA_HOURS: Record<string, number> = {
  RNE: 72,
  DGI: 48,
  CNSS: 48,
  APII: 24, // statutory "attestation de dépôt de déclaration"
  BCT: 72,
  DEFAULT: DEFAULT_SLA_HOURS,
};

export const DEADLINE_BUCKET_ORDER: Record<DeadlineBucket, number> = {
  overdue: 0,
  due_soon: 1,
  upcoming: 2,
  unknown: 3,
};

export const SLA_BUCKET_ORDER: Record<SlaBucket, number> = {
  breached: 0,
  at_risk: 1,
  on_time: 2,
};

export function slaHoursForAgency(agencyId: string | null | undefined): number {
  if (!agencyId) return DEFAULT_SLA_HOURS;
  return AGENCY_SLA_HOURS[agencyId] ?? DEFAULT_SLA_HOURS;
}

export function computeSla(input: {
  submittedAt: Date | string | null | undefined;
  now?: Date;
  agencyId?: string | null;
}): {
  dueAt: Date | null;
  bucket: SlaBucket;
  ageHours: number;
  ageDays: number;
  hoursRemaining: number;
  percentElapsed: number;
} {
  const submittedAt = toDate(input?.submittedAt);
  if (!submittedAt) {
    return {
      dueAt: null,
      bucket: "on_time",
      ageHours: 0,
      ageDays: 0,
      hoursRemaining: 0,
      percentElapsed: 0,
    };
  }

  const now = toDate(input?.now) ?? new Date();
  const slaHours = slaHoursForAgency(input?.agencyId);
  const dueAt = new Date(submittedAt.getTime() + slaHours * HOUR_MS);
  const ageHours = Math.max(0, (now.getTime() - submittedAt.getTime()) / HOUR_MS);
  const ageDays = Math.floor(ageHours / 24);
  const hoursRemaining = (dueAt.getTime() - now.getTime()) / HOUR_MS;
  const percentElapsed = clamp((ageHours / slaHours) * 100, 0, 100);
  const bucket: SlaBucket =
    now.getTime() > dueAt.getTime() ? "breached" : percentElapsed >= 75 ? "at_risk" : "on_time";

  return { dueAt, bucket, ageHours, ageDays, hoursRemaining, percentElapsed };
}

/**
 * Next UTC occurrence of a calendar date (month 1-based), rolling to next year
 * when the date at 00:00 UTC is not strictly after `now`.
 */
export function nextOccurrenceOfDay(now: Date, month1Based: number, day: number): Date {
  const base = toDate(now) ?? new Date();
  const monthIndex = clamp(Math.trunc(toNumber(month1Based) ?? 1), 1, 12) - 1;
  const candidate = buildUtcDate(base.getUTCFullYear(), monthIndex, toNumber(day) ?? 1);
  if (candidate.getTime() > base.getTime()) return candidate;
  return buildUtcDate(base.getUTCFullYear() + 1, monthIndex, toNumber(day) ?? 1);
}

/**
 * Resolve the next deadline for an obligation rule. Handles every rule shape
 * present in the seed data; returns `null` when a rule cannot be resolved
 * without guessing (or requires an event anchor that was not provided).
 */
export function resolveObligationDeadline(
  rule: unknown,
  now: Date,
  opts?: { personType?: "physical" | "moral"; eventDate?: Date | null },
): Date | null {
  if (!isObject(rule)) return null;
  const base = toDate(now) ?? new Date();
  const type = typeof rule.type === "string" ? rule.type : null;
  if (!type) return null;

  switch (type) {
    case "monthly": {
      const day = resolveMonthlyDay(rule, opts?.personType);
      if (day === null) return null;
      return nextMonthlyOccurrence(base, day);
    }

    case "annual": {
      const month = toNumber(rule.month);
      const day = toNumber(rule.day);
      if (month === null || day === null) return null;
      return nextOccurrenceOfDay(base, month, day);
    }

    case "days_after_event": {
      const days = toNumber(rule.days);
      if (days === null) return null;
      const eventDate = toDate(opts?.eventDate ?? null);
      if (!eventDate) return null;
      return new Date(eventDate.getTime() + days * DAY_MS);
    }

    case "installments": {
      const months = Array.isArray(rule.months)
        ? rule.months.map((m) => toNumber(m)).filter((m): m is number => m !== null)
        : [];
      if (months.length === 0) return null;
      const day = toNumber(rule.day) ?? 1;
      return nextInstallmentOccurrence(base, months, day);
    }

    default:
      // "before_activity_start", "on_change", unknown/missing shapes: no anchor.
      return null;
  }
}

export function deadlineBucket(
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
  dueSoonDays = 30,
): DeadlineBucket {
  const due = toDate(dueDate);
  if (!due) return "unknown";
  const base = toDate(now) ?? new Date();
  const diffMs = due.getTime() - base.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= Math.max(0, dueSoonDays) * DAY_MS) return "due_soon";
  return "upcoming";
}

export function daysUntil(
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  const due = toDate(dueDate);
  if (!due) return null;
  const base = toDate(now) ?? new Date();
  const diffDays = (due.getTime() - base.getTime()) / DAY_MS;
  if (diffDays < 0) return -Math.ceil(-diffDays);
  return Math.round(diffDays);
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

function resolveMonthlyDay(
  rule: Record<string, unknown>,
  personType?: "physical" | "moral",
): number | null {
  const physical = toNumber(rule.physicalDay);
  const moral = toNumber(rule.moralDay);
  const day = toNumber(rule.day);
  if (personType === "moral") return moral ?? day ?? physical ?? null;
  if (personType === "physical") return physical ?? day ?? moral ?? null;
  return moral ?? physical ?? day ?? null;
}

function nextMonthlyOccurrence(now: Date, day: number): Date {
  const candidate = buildUtcDate(now.getUTCFullYear(), now.getUTCMonth(), day);
  if (candidate.getTime() > now.getTime()) return candidate;
  return buildUtcDate(now.getUTCFullYear(), now.getUTCMonth() + 1, day);
}

function nextInstallmentOccurrence(now: Date, months: number[], day: number): Date {
  const sorted = [...new Set(months.map((m) => clamp(Math.trunc(m), 1, 12)))].sort((a, b) => a - b);
  const currentMonth = now.getUTCMonth() + 1;
  for (const month of sorted) {
    if (month < currentMonth) continue;
    const candidate = buildUtcDate(now.getUTCFullYear(), month - 1, day);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  return buildUtcDate(now.getUTCFullYear() + 1, sorted[0]! - 1, day);
}

function buildUtcDate(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const safeDay = clamp(Math.trunc(day), 1, lastDay);
  return new Date(Date.UTC(year, monthIndex, safeDay));
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

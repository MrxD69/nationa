const NUMERIC_CANDIDATE = /^-?\d[\d\s.,'\u00a0\u202f]*$/;
const NUMERIC_WITH_CURRENCY = /^-?\d[\d\s.,'\u00a0\u202f]*$/;
const CURRENCY_SUFFIX = /\s*(TND|DT|USD|EUR|GBP|\u20ac|\$)\s*$/i;

export function normalizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
  return normalized.length > 0 ? normalized : null;
}

function parseNumericString(value: string): number | null {
  let s = value.replace(/[\s'\u00a0\u202f]/g, "");
  if (!s) {
    return null;
  }

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const isThousands = /^\d{1,3}(,\d{3})+$/.test(s);
    if (isThousands) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(",", ".");
    }
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }

  const parsed = Number(s);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (NUMERIC_CANDIDATE.test(trimmed)) {
    return parseNumericString(trimmed);
  }
  const withoutCurrency = trimmed.replace(CURRENCY_SUFFIX, "").trim();
  if (withoutCurrency !== trimmed && NUMERIC_WITH_CURRENCY.test(withoutCurrency)) {
    return parseNumericString(withoutCurrency);
  }
  return null;
}

function makeUtcDate(year: string, month: string, day: string): Date | null {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    return makeUtcDate(iso[1] ?? "", iso[2] ?? "", iso[3] ?? "");
  }

  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (dayFirst) {
    return makeUtcDate(dayFirst[3] ?? "", dayFirst[2] ?? "", dayFirst[1] ?? "");
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function sameValue(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  if (dateA && dateB) {
    return dateA.getTime() === dateB.getTime();
  }
  const numberA = parseNumber(a);
  const numberB = parseNumber(b);
  if (numberA !== null && numberB !== null) {
    return numberA === numberB;
  }
  const textA = normalizeText(a);
  const textB = normalizeText(b);
  return textA !== null && textA === textB;
}

export function displayValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return value;
}

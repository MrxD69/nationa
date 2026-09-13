import type { ComputedRef } from "vue";

/**
 * Démarches are public templates, so they are not part of the company workspace.
 * What *is* worth keeping in front of someone is the handful they have actually
 * started: those stay pinned under the Démarches rail item, with their progress,
 * until they are finished with them.
 */
export type PinnedAction = {
  templateId: string;
  caseId: string | null;
  companyId: string | null;
  nameFr: string;
  nameAr: string | null;
  agencyId: string | null;
  progress: number;
  updatedAt: number;
};

const COOKIE_KEY = "nationa:open-actions";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const MAX_PINNED = 6;

function sanitize(value: unknown): PinnedAction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: PinnedAction[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const row = entry as Partial<PinnedAction>;
    if (typeof row.templateId !== "string" || row.templateId.length === 0) {
      continue;
    }
    if (typeof row.nameFr !== "string") {
      continue;
    }
    rows.push({
      templateId: row.templateId,
      caseId: typeof row.caseId === "string" ? row.caseId : null,
      companyId: typeof row.companyId === "string" ? row.companyId : null,
      nameFr: row.nameFr,
      nameAr: typeof row.nameAr === "string" ? row.nameAr : null,
      agencyId: typeof row.agencyId === "string" ? row.agencyId : null,
      progress: typeof row.progress === "number" ? Math.min(100, Math.max(0, row.progress)) : 0,
      updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : 0,
    });
  }
  return rows;
}

export function useOpenActions(): {
  pinned: ComputedRef<PinnedAction[]>;
  track: (entry: Omit<PinnedAction, "updatedAt">) => void;
  unpin: (templateId: string) => void;
  isPinned: (templateId: string) => boolean;
} {
  const cookie = useCookie<PinnedAction[] | null>(COOKIE_KEY, {
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });

  const state = useState<PinnedAction[]>("open-actions", () => sanitize(cookie.value));

  function persist(rows: PinnedAction[]) {
    state.value = rows;
    if (import.meta.client) {
      cookie.value = rows;
    }
  }

  const pinned = computed(() =>
    [...state.value].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_PINNED),
  );

  function track(entry: Omit<PinnedAction, "updatedAt">) {
    const next: PinnedAction = { ...entry, updatedAt: Date.now() };
    const rest = state.value.filter((row) => row.templateId !== entry.templateId);
    persist([next, ...rest].slice(0, MAX_PINNED));
  }

  function unpin(templateId: string) {
    persist(state.value.filter((row) => row.templateId !== templateId));
  }

  function isPinned(templateId: string): boolean {
    return state.value.some((row) => row.templateId === templateId);
  }

  return { pinned, track, unpin, isPinned };
}

import { computed, watch } from "vue";
import type { ComputedRef, Ref } from "vue";

import { COMPANY_QUERY_KEY, isCompanyAwarePath } from "~/constants/navigation";

export type CompanySummary = {
  id: string;
  legalName: string;
  legalNameAr?: string | null;
  tradeName?: string | null;
  status?: string | null;
  uniqueIdentifier?: string | null;
  role?: string | null;
  scopes?: string[] | null;
};

type CompanyListRow = CompanySummary;

const COMPANY_COOKIE_KEY = "nationa:companyId";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function toSummary(row: CompanyListRow): CompanySummary {
  return {
    id: row.id,
    legalName: row.legalName,
    legalNameAr: row.legalNameAr ?? null,
    tradeName: row.tradeName ?? null,
    status: row.status ?? null,
    uniqueIdentifier: row.uniqueIdentifier ?? null,
    role: row.role ?? null,
    scopes: row.scopes ?? null,
  };
}

function readId(value: unknown): string | null {
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === "string" && first.length > 0 ? first : null;
  }
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function useSelectedCompany(): {
  selectedCompanyId: Ref<string | null>;
  selectedCompany: ComputedRef<CompanySummary | null>;
  /**
   * The selected company id only once it has been confirmed to be one the signed-in
   * user actually holds a grant for. Anything sent to the API should use this, never
   * `selectedCompanyId`, which may still hold a value seeded from the URL or from a
   * cookie left behind by a previous session on this browser.
   */
  accessibleCompanyId: ComputedRef<string | null>;
  companies: ComputedRef<CompanySummary[]>;
  loading: Ref<boolean>;
  loaded: Ref<boolean>;
  hasCompany: ComputedRef<boolean>;
  selectCompany: (id: string | null) => void;
  clearCompany: () => void;
  reload: () => Promise<void>;
} {
  const route = useRoute();
  const router = useRouter();
  const client = useApi();
  const cookie = useCookie<string | null>(COMPANY_COOKIE_KEY, {
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });

  const selectedCompanyId = useState<string | null>("selected-company", () => null);
  const companyList = useState<CompanySummary[]>("selected-company-list", () => []);
  const loading = useState<boolean>("selected-company-loading", () => false);
  const initialized = useState<boolean>("selected-company-initialized", () => false);
  const loaded = useState<boolean>("selected-company-loaded", () => false);

  const companies = computed<CompanySummary[]>(() => companyList.value);
  const selectedCompany = computed<CompanySummary | null>(
    () => companyList.value.find((company) => company.id === selectedCompanyId.value) ?? null,
  );
  const hasCompany = computed(() => selectedCompanyId.value !== null);
  const accessibleCompanyId = computed<string | null>(() =>
    loaded.value && selectedCompany.value ? selectedCompany.value.id : null,
  );

  function syncQuery(id: string | null) {
    if (!import.meta.client || !isCompanyAwarePath(route.path)) {
      return;
    }
    if (readId(route.query[COMPANY_QUERY_KEY]) === id) {
      return;
    }
    void router.replace({
      query: { ...route.query, [COMPANY_QUERY_KEY]: id ?? undefined },
    });
  }

  function applySelection(id: string | null, options: { syncUrl?: boolean } = {}) {
    const changed = selectedCompanyId.value !== id;
    selectedCompanyId.value = id;
    if (import.meta.client) {
      cookie.value = id;
    }
    if (options.syncUrl !== false && changed) {
      syncQuery(id);
    }
  }

  function selectCompany(id: string | null) {
    applySelection(id, { syncUrl: true });
  }

  function clearCompany() {
    selectCompany(null);
  }

  function ensureSelected() {
    if (selectedCompanyId.value) {
      return;
    }
    const [first] = companyList.value;
    if (first) {
      selectCompany(first.id);
    }
  }

  function seedFromContext() {
    if (selectedCompanyId.value) {
      return;
    }
    const fromPath = readId(route.params.companyId);
    const fromQuery = readId(route.query[COMPANY_QUERY_KEY]);
    const fromCookie = readId(cookie.value);
    const seed = fromPath ?? fromQuery ?? fromCookie;
    if (seed) {
      applySelection(seed, { syncUrl: false });
    }
  }

  /**
   * Drop a selection the signed-in user has no grant for.
   *
   * The selection is seeded from the URL and from a long-lived cookie, neither of
   * which is tied to a user. On a shared browser that means one account can inherit
   * the previous account's company id, and every company-scoped request then fails
   * with "No access to this company". The server is right to refuse; the client is
   * what has to stop asking.
   */
  function reconcileSelection() {
    const current = selectedCompanyId.value;
    if (current && !companyList.value.some((company) => company.id === current)) {
      applySelection(null, { syncUrl: true });
    }
    ensureSelected();
  }

  async function reload(): Promise<void> {
    loading.value = true;
    try {
      const rows = (await client.companies.list({ view: "all" })) as unknown as CompanyListRow[];
      companyList.value = rows.map(toSummary);
      loaded.value = true;
      reconcileSelection();
    } catch {
      companyList.value = [];
    } finally {
      loading.value = false;
    }
  }

  seedFromContext();

  watch(
    () => route.params.companyId,
    (value) => {
      const id = readId(value);
      if (id && id !== selectedCompanyId.value) {
        selectCompany(id);
      }
    },
  );

  if (import.meta.client && !initialized.value) {
    initialized.value = true;
    void reload();
  }

  return {
    selectedCompanyId,
    selectedCompany,
    accessibleCompanyId,
    companies,
    loading,
    loaded,
    hasCompany,
    selectCompany,
    clearCompany,
    reload,
  };
}

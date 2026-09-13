import { computed } from "vue";
import type { ComputedRef, Ref } from "vue";

import { parseAccountType } from "@nationa/api/domain/account";

export type OfficerAgency = {
  id: string;
  nameFr: string;
  nameAr?: string | null;
  role?: string;
};

/**
 * Query params used by officer pages to keep the active agency shareable.
 * Returns an empty object when there is no agency so callers can spread it
 * unconditionally.
 */
export function officerQuery(agencyId: string | null): { agencyId?: string } {
  return agencyId ? { agencyId } : {};
}

function readId(value: unknown): string | null {
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === "string" && first.length > 0 ? first : null;
  }
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Shared officer agency selection.
 *
 * Every officer page reads the same `useState` keys, so switching agency from
 * the shell navbar updates all of them at once and the choice survives client
 * navigation. `ensureLoaded()` is idempotent and never throws: on failure it
 * records the error and flips `ready` so pages can show a retry instead of
 * hanging on a spinner.
 */
export function useOfficerAgency(): {
  agencies: Ref<OfficerAgency[]>;
  agencyId: Ref<string | null>;
  current: ComputedRef<OfficerAgency | null>;
  agencyRole: ComputedRef<string | null>;
  singleAgency: ComputedRef<boolean>;
  isMinistryAgent: ComputedRef<boolean>;
  ready: Ref<boolean>;
  error: Ref<string | null>;
  ensureLoaded: () => Promise<void>;
  setAgency: (id: string) => void;
} {
  const route = useRoute();
  const client = useApi();
  const { user } = useAuth();

  const agencies = useState<OfficerAgency[]>("officer.agencies", () => []);
  const agencyId = useState<string | null>("officer.agencyId", () => null);
  const ready = useState<boolean>("officer.agenciesReady", () => false);
  const error = useState<string | null>("officer.agenciesError", () => null);
  const loading = useState<boolean>("officer.agenciesLoading", () => false);

  // Same pattern/keys as AppRail + useNavigation: a platform `admin` account is
  // the ministry agent with oversight across every organization.
  const { data: session } = useAsyncData("session-account-type", () => client.session.get(), {
    lazy: true,
  });

  const isMinistryAgent = computed(() => {
    const accountType =
      parseAccountType(session.value?.accountType) ??
      parseAccountType(user.value?.user_metadata?.accountType) ??
      null;
    return accountType === "admin";
  });

  const current = computed<OfficerAgency | null>(
    () => agencies.value.find((agency) => agency.id === agencyId.value) ?? null,
  );

  const agencyRole = computed<string | null>(() => current.value?.role ?? null);
  const singleAgency = computed<boolean>(() => agencies.value.length <= 1);

  function hasAgency(id: string): boolean {
    return agencies.value.some((agency) => agency.id === id);
  }

  function setAgency(id: string): void {
    agencyId.value = id;
    if (!import.meta.client) {
      return;
    }
    if (readId(route.query.agencyId) === id) {
      return;
    }
    void navigateTo({ query: { ...route.query, agencyId: id } }, { replace: true });
  }

  async function ensureLoaded(): Promise<void> {
    if (loading.value) {
      return;
    }

    // Already resolved (success): keep the shared selection, but honour a
    // valid ?agencyId from the URL so deep links stay authoritative.
    if (ready.value && !error.value) {
      const fromQuery = readId(route.query.agencyId);
      if (fromQuery && fromQuery !== agencyId.value && hasAgency(fromQuery)) {
        setAgency(fromQuery);
      }
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const rows = (await client.officer.myAgencies()) as OfficerAgency[];
      agencies.value = Array.isArray(rows) ? rows : [];

      const fromQuery = readId(route.query.agencyId);
      const pick = fromQuery && hasAgency(fromQuery) ? fromQuery : (agencies.value[0]?.id ?? null);

      if (pick) {
        setAgency(pick);
      } else {
        agencyId.value = null;
      }
    } catch {
      agencies.value = [];
      agencyId.value = null;
      error.value = "officer.agencies.error";
    } finally {
      ready.value = true;
      loading.value = false;
    }
  }

  return {
    agencies,
    agencyId,
    current,
    agencyRole,
    singleAgency,
    isMinistryAgent,
    ready,
    error,
    ensureLoaded,
    setAgency,
  };
}

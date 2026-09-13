<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import { officerQuery } from "~/composables/useOfficerAgency";

definePageMeta({ layout: "officer", middleware: "auth" });

type CompanyResult = {
  companyId: string;
  legalName: string;
  legalNameAr?: string | null;
  tradeName?: string | null;
  uniqueIdentifier?: string | null;
  legalForm?: string | null;
  taxId?: string | null;
  registryState?: string | null;
  status?: string | null;
  accessibleAgencies?: string[];
};

const tableUi = {
  base: "w-full min-w-[48rem]",
  th: "px-4 py-2 whitespace-nowrap",
  td: "px-4 py-2 whitespace-normal align-middle",
};

const { t, te, locale } = useI18n();
const api = useApi();
const { ready, error: agencyError, agencyId, ensureLoaded } = useOfficerAgency();

const ButtonComp = resolveComponent("UButton");
const BadgeComp = resolveComponent("UBadge");

const query = ref("");
const results = ref<CompanyResult[]>([]);
const loading = ref(false);
const searched = ref(false);
const searchError = ref<string | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function companyName(item: CompanyResult): string {
  if (locale.value === "ar") {
    return item.legalNameAr || item.legalName || item.tradeName || "—";
  }
  return item.tradeName || item.legalName || item.legalNameAr || "—";
}

function registryLabel(state?: string | null): string {
  if (!state) {
    return "—";
  }
  const key = `officerTrust.dossier.registryStates.${state}`;
  return te(key) ? t(key) : t("officerTrust.common.unknown");
}

function registryColor(state?: string | null): "success" | "warning" | "error" | "neutral" {
  switch (state) {
    case "actif":
      return "success";
    case "suspendu":
      return "warning";
    case "radie":
      return "error";
    default:
      return "neutral";
  }
}

function accessCount(item: CompanyResult): number {
  return Array.isArray(item.accessibleAgencies) ? item.accessibleAgencies.length : 0;
}

function openLink(item: CompanyResult) {
  return { path: `/officer/companies/${item.companyId}`, query: officerQuery(agencyId.value) };
}

async function runSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  const term = query.value.trim();
  if (term.length < 2 || !agencyId.value) {
    return;
  }
  loading.value = true;
  searchError.value = null;
  try {
    const response = await api.officer.dossierSearch({
      agencyId: agencyId.value,
      query: term,
      limit: 25,
    });
    results.value = Array.isArray(response?.items) ? (response.items as CompanyResult[]) : [];
  } catch (cause) {
    results.value = [];
    searchError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    searched.value = true;
    loading.value = false;
  }
}

function scheduleSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  const term = query.value.trim();
  if (term.length < 2) {
    results.value = [];
    searched.value = false;
    searchError.value = null;
    return;
  }
  debounceTimer = setTimeout(() => {
    void runSearch();
  }, 350);
}

watch(query, scheduleSearch);

onMounted(() => {
  void ensureLoaded();
});

const columns = computed<TableColumn<CompanyResult>[]>(() => [
  {
    accessorKey: "legalName",
    header: t("officerTrust.search.columns.company"),
    cell: ({ row }) =>
      h("div", { class: "min-w-0" }, [
        h(
          "span",
          { class: "block truncate text-sm font-medium text-highlighted" },
          companyName(row.original),
        ),
        row.original.tradeName && locale.value !== "ar"
          ? h("span", { class: "block truncate text-xs text-muted" }, row.original.tradeName)
          : null,
      ]),
  },
  {
    accessorKey: "uniqueIdentifier",
    header: t("officerTrust.search.columns.identifier"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "tabular text-sm text-highlighted", dir: "ltr" },
        row.original.uniqueIdentifier || "—",
      ),
  },
  {
    accessorKey: "taxId",
    header: t("officerTrust.dossier.fields.taxId"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "tabular text-sm text-highlighted", dir: "ltr" },
        row.original.taxId || "—",
      ),
  },
  {
    accessorKey: "legalForm",
    header: t("officerTrust.search.columns.form"),
    cell: ({ row }) => {
      const form = row.original.legalForm;
      return form
        ? h(BadgeComp, { color: "neutral", variant: "subtle", label: form })
        : h("span", { class: "text-sm text-muted" }, "—");
    },
  },
  {
    accessorKey: "registryState",
    header: t("officerTrust.search.columns.state"),
    cell: ({ row }) =>
      h(BadgeComp, {
        color: registryColor(row.original.registryState),
        variant: "subtle",
        label: registryLabel(row.original.registryState),
      }),
  },
  {
    id: "access",
    header: t("officerTrust.search.columns.access"),
    cell: ({ row }) =>
      h(BadgeComp, {
        color: "neutral",
        variant: "soft",
        icon: "i-tabler-building-bank",
        label: t("officerTrust.search.accessCount", { count: accessCount(row.original) }),
      }),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      h(ButtonComp, {
        to: openLink(row.original),
        size: "md",
        color: "primary",
        variant: "soft",
        icon: "i-tabler-folder-open",
        label: t("officerTrust.search.open"),
      }),
  },
]);
</script>

<template>
  <div class="w-full space-y-6">
    <LoadingState
      v-if="!ready"
      variant="skeleton-rows"
      :count="4"
      :label="t('officerTrust.common.loading')"
    />

    <UAlert
      v-else-if="agencyError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('officerTrust.search.error')"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="md"
          icon="i-tabler-reload"
          :label="t('officerTrust.common.retry')"
          @click="ensureLoaded()"
        />
      </template>
    </UAlert>

    <UAlert
      v-else-if="!agencyId"
      color="neutral"
      variant="subtle"
      icon="i-tabler-info-circle"
      :description="t('officer.agency.none')"
    />

    <template v-else>
      <div class="flex flex-col gap-2 border-b border-default pb-4 sm:flex-row sm:items-center">
        <UInput
          id="company-search"
          v-model="query"
          size="lg"
          icon="i-tabler-search"
          class="w-full sm:flex-1"
          :aria-label="t('officerTrust.search.label')"
          :placeholder="t('officerTrust.search.placeholder')"
          @keydown.enter="runSearch"
        />
        <UButton
          size="md"
          icon="i-tabler-search"
          :loading="loading"
          :disabled="query.trim().length < 2"
          :label="t('officerTrust.search.action')"
          @click="runSearch"
        />
      </div>

      <LoadingState
        v-if="loading"
        variant="skeleton-rows"
        :count="5"
        :label="t('officerTrust.search.searching')"
      />

      <UAlert
        v-else-if="searchError"
        color="error"
        variant="subtle"
        icon="i-tabler-alert-triangle"
        :title="t('officerTrust.search.error')"
      >
        <template #actions>
          <UButton
            color="error"
            variant="soft"
            size="md"
            icon="i-tabler-reload"
            :label="t('officerTrust.common.retry')"
            @click="runSearch()"
          />
        </template>
      </UAlert>

      <EmptyState
        v-else-if="!searched"
        icon="i-tabler-building-search"
        :title="t('officerTrust.search.empty')"
        :description="t('officerTrust.search.emptyDescription')"
      />

      <EmptyState
        v-else-if="results.length === 0"
        icon="i-tabler-building-off"
        :title="t('officerTrust.search.noResult')"
        :description="t('officerTrust.search.noResultDescription')"
      />

      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <UTable :data="results" :columns="columns" :loading="loading" :ui="tableUi" />
        </div>

        <section
          class="divide-y divide-default md:hidden"
          :aria-label="t('officerTrust.search.title')"
        >
          <article v-for="item in results" :key="item.companyId" class="space-y-2 py-3">
            <div class="flex items-start justify-between gap-3">
              <p class="min-w-0 truncate text-sm font-medium text-highlighted">
                {{ companyName(item) }}
              </p>
              <UBadge
                :color="registryColor(item.registryState)"
                variant="subtle"
                :label="registryLabel(item.registryState)"
                class="shrink-0"
              />
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span class="text-muted">
                {{ t("officerTrust.search.columns.identifier") }}:
                <span dir="ltr" class="tabular text-highlighted">
                  {{ item.uniqueIdentifier || "—" }}
                </span>
              </span>
              <UBadge
                color="neutral"
                variant="soft"
                icon="i-tabler-building-bank"
                :label="t('officerTrust.search.accessCount', { count: accessCount(item) })"
              />
            </div>

            <UButton
              :to="openLink(item)"
              block
              size="md"
              color="primary"
              variant="soft"
              icon="i-tabler-folder-open"
              :label="t('officerTrust.search.open')"
            />
          </article>
        </section>
      </template>
    </template>
  </div>
</template>

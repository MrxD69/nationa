<script setup lang="ts">
import ActionAgencyNav from "~/components/action/ActionAgencyNav.vue";
import ActionRow from "~/components/action/ActionRow.vue";
import ActionSearchIntent from "~/components/action/ActionSearchIntent.vue";
import type { ActionCatalogItem } from "~/composables/useActions";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import SectionHeader from "~/components/ui/SectionHeader.vue";

/**
 * The catalog payload may expose recommendation hints before the API contract
 * is finalised, so we widen the item locally and guard every read with v-if.
 */
type CatalogItem = ActionCatalogItem & {
  recommended?: boolean;
  recommendationReason?: string | null;
};

type AgencyGroup = {
  id: string;
  label: string;
  items: CatalogItem[];
};

const props = defineProps<{ companyId?: string }>();

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const actions = useActions();

const initialQuery = typeof route.query.q === "string" ? route.query.q : "";
const initialAgency =
  typeof route.query.agency === "string" && route.query.agency.length > 0
    ? route.query.agency
    : undefined;

const selectedAgency = ref<string | undefined>(initialAgency);
const query = ref(initialQuery);

// Keep the URL shareable: filters survive reload, back/forward and links.
watch([query, selectedAgency], ([nextQuery, nextAgency]) => {
  const next = { ...route.query };
  const trimmed = nextQuery.trim();
  if (trimmed) {
    next.q = trimmed;
  } else {
    delete next.q;
  }
  if (nextAgency) {
    next.agency = nextAgency;
  } else {
    delete next.agency;
  }
  router.replace({ query: next });
});

const queryRef = computed(() => query.value);
const companyRef = computed(() => props.companyId);
const searchEnabled = computed(() => query.value.trim().length > 0);

const catalog = actions.catalogQuery({ companyId: companyRef });
const outstanding = actions.outstandingQuery({ companyId: companyRef, limit: 5 });
const search = actions.searchQuery({
  query: queryRef,
  companyId: companyRef,
  enabled: searchEnabled,
});

const items = computed<CatalogItem[]>(() => (catalog.data.value ?? []) as CatalogItem[]);
const outstandingItems = computed(() => outstanding.data.value ?? []);
const showingSearch = computed(() => query.value.trim().length > 0);
const searchItems = computed<CatalogItem[]>(() => (search.data.value ?? []) as CatalogItem[]);

/*
 * Group headings get the administration's full name — "Registre National des
 * Entreprises" reads far better as a heading than the acronym the filter chips
 * use — and fall back to the translated abbreviation when the payload has none.
 */
function agencyName(item: CatalogItem): string {
  const name = locale.value === "ar" ? (item.agencyNameAr ?? item.agencyNameFr) : item.agencyNameFr;
  return name ?? t(`actions.agencies.${item.agencyId}`, item.agencyId);
}

const agencies = computed(() => {
  const seen = new Map<string, { id: string; nameFr: string | null; nameAr: string | null }>();
  for (const item of items.value) {
    if (!seen.has(item.agencyId)) {
      seen.set(item.agencyId, {
        id: item.agencyId,
        nameFr: item.agencyNameFr,
        nameAr: item.agencyNameAr,
      });
    }
  }
  return [...seen.values()];
});

const displayItems = computed<CatalogItem[]>(() => {
  if (showingSearch.value) {
    return searchItems.value;
  }
  if (!selectedAgency.value) {
    return items.value;
  }
  return items.value.filter((item) => item.agencyId === selectedAgency.value);
});

const recommendedItems = computed(() =>
  displayItems.value.filter((item) => item.recommended === true),
);

/*
 * Grouping only earns its keep while the whole catalogue is on screen. Once a
 * single administration is selected, every heading would repeat the filter, so
 * the list stays flat.
 */
const grouped = computed(() => !selectedAgency.value);

const agencyGroups = computed<AgencyGroup[]>(() => {
  const groups = new Map<string, AgencyGroup>();
  for (const item of displayItems.value) {
    const group = groups.get(item.agencyId);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(item.agencyId, { id: item.agencyId, label: agencyName(item), items: [item] });
    }
  }
  return [...groups.values()];
});

const hasFilters = computed(
  () => query.value.trim().length > 0 || selectedAgency.value !== undefined,
);

const catalogCount = computed(() =>
  t("actions.hub.count", { count: displayItems.value.length }, displayItems.value.length),
);

const isLoading = computed(() =>
  showingSearch.value ? search.isLoading.value : catalog.isLoading.value,
);

const isError = computed(() =>
  showingSearch.value ? search.isError.value : catalog.isError.value,
);

const error = computed(() => (showingSearch.value ? search.error.value : catalog.error.value));

function retry(): void {
  if (showingSearch.value) {
    search.refetch();
  } else {
    catalog.refetch();
  }
}

function clearFilters(): void {
  query.value = "";
  selectedAgency.value = undefined;
}
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      :title="t('actions.title')"
      :subtitle="t('actions.subtitle')"
      icon="i-tabler-file-description"
      max-width="max-w-6xl"
    />

    <ActionSearchIntent v-model="query" />

    <LoadingState v-if="isLoading" variant="skeleton-list" :count="6" />

    <UAlert
      v-else-if="isError"
      class="rounded-lg"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('actions.hub.error')"
      :description="error?.message"
    >
      <template #actions>
        <UButton color="error" variant="soft" :label="t('actions.hub.retry')" @click="retry" />
      </template>
    </UAlert>

    <!-- Search replaces the whole catalogue: one list, one question answered. -->
    <section v-else-if="showingSearch" class="space-y-3">
      <SectionHeader
        :title="t('actions.search.results')"
        icon="i-tabler-search"
        :count="catalogCount"
      >
        <template #actions>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-tabler-x"
            :label="t('actions.search.clear')"
            @click="clearFilters"
          />
        </template>
      </SectionHeader>

      <EmptyState
        v-if="displayItems.length === 0"
        icon="i-tabler-search-off"
        :title="t('actions.search.empty')"
        :description="t('actions.search.emptyHint')"
      >
        <UButton
          color="neutral"
          variant="outline"
          icon="i-tabler-arrow-back-up"
          :label="t('actions.search.clear')"
          @click="clearFilters"
        />
      </EmptyState>

      <div
        v-else
        v-reveal.stagger="{ y: 8, duration: 0.35 }"
        class="divide-y divide-default overflow-hidden rounded-lg border border-default"
      >
        <ActionRow
          v-for="item in displayItems"
          :key="item.id"
          data-reveal-item
          :item="item"
          :company-id="props.companyId"
          show-agency
        />
      </div>
    </section>

    <template v-else>
      <!-- Unfinished work first: it is the only thing on this page that is
           already waiting on the person reading it. -->
      <section v-if="outstandingItems.length" class="space-y-3">
        <SectionHeader
          :title="t('actions.hub.outstanding')"
          :description="t('actions.hub.outstandingHint')"
          icon="i-tabler-player-play"
          :count="outstandingItems.length"
        />
        <div
          v-reveal.stagger="{ y: 8, duration: 0.35 }"
          class="divide-y divide-default overflow-hidden rounded-lg border border-default"
        >
          <ActionRow
            v-for="item in outstandingItems"
            :key="item.id"
            data-reveal-item
            :item="item"
            :company-id="props.companyId"
            show-agency
          />
        </div>
      </section>

      <section v-if="recommendedItems.length" class="space-y-3">
        <SectionHeader
          :title="t('actions.hub.recommended')"
          :description="t('actions.hub.recommendedHint')"
          icon="i-tabler-sparkles"
          :count="recommendedItems.length"
        />
        <div
          v-reveal.stagger="{ y: 8, duration: 0.35 }"
          class="divide-y divide-default overflow-hidden rounded-lg border border-default"
        >
          <ActionRow
            v-for="item in recommendedItems"
            :key="item.id"
            data-reveal-item
            :item="item"
            :reason="item.recommendationReason"
            :company-id="props.companyId"
            show-agency
            highlight
          />
        </div>
      </section>

      <section class="space-y-4">
        <SectionHeader
          :title="t('actions.hub.allActions')"
          :description="t('actions.hub.allActionsHint')"
          icon="i-tabler-list-details"
          :count="catalogCount"
        >
          <template v-if="hasFilters" #actions>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-tabler-filter-off"
              :label="t('actions.filters.clear')"
              @click="clearFilters"
            />
          </template>
        </SectionHeader>

        <ActionAgencyNav
          v-model="selectedAgency"
          :agencies="agencies"
          :all-label="t('actions.agencies.all')"
        />

        <EmptyState
          v-if="displayItems.length === 0"
          icon="i-tabler-inbox"
          :title="t('actions.hub.empty')"
          :description="t('actions.hub.emptyHint')"
        >
          <UButton
            color="neutral"
            variant="outline"
            icon="i-tabler-filter-off"
            :label="t('actions.filters.clear')"
            @click="clearFilters"
          />
        </EmptyState>

        <div v-else-if="grouped" class="space-y-6">
          <div v-for="group in agencyGroups" :key="group.id" class="space-y-2">
            <h3
              class="flex items-baseline gap-2 px-1 text-sm font-semibold tracking-wide text-dimmed uppercase"
            >
              {{ group.label }}
              <span class="tabular font-medium normal-case">{{ group.items.length }}</span>
            </h3>
            <div
              v-reveal.stagger="{ y: 8, duration: 0.35 }"
              class="divide-y divide-default overflow-hidden rounded-lg border border-default"
            >
              <ActionRow
                v-for="item in group.items"
                :key="item.id"
                data-reveal-item
                :item="item"
                :company-id="props.companyId"
              />
            </div>
          </div>
        </div>

        <div
          v-else
          v-reveal.stagger="{ y: 8, duration: 0.35 }"
          class="divide-y divide-default overflow-hidden rounded-lg border border-default"
        >
          <ActionRow
            v-for="item in displayItems"
            :key="item.id"
            data-reveal-item
            :item="item"
            :company-id="props.companyId"
          />
        </div>
      </section>
    </template>
  </div>
</template>

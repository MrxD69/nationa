<script setup lang="ts">
import ActionAgencyNav from "~/components/action/ActionAgencyNav.vue";
import ActionOutstandingList from "~/components/action/ActionOutstandingList.vue";
import ActionRow from "~/components/action/ActionRow.vue";
import ActionSearchIntent from "~/components/action/ActionSearchIntent.vue";
import RecommendedActionCard from "~/components/action/RecommendedActionCard.vue";
import type { ActionCatalogItem } from "~/composables/useActions";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
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
  items: CatalogItem[];
};

const props = defineProps<{ companyId?: string }>();

const { t } = useI18n();
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

const agencyGroups = computed<AgencyGroup[]>(() => {
  const groups = new Map<string, AgencyGroup>();
  for (const item of displayItems.value) {
    const group = groups.get(item.agencyId);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(item.agencyId, { id: item.agencyId, items: [item] });
    }
  }
  return [...groups.values()];
});

function agencyLabel(agencyId: string): string {
  return t(`actions.agencies.${agencyId}`, agencyId);
}

const hasFilters = computed(
  () => query.value.trim().length > 0 || selectedAgency.value !== undefined,
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
  <div class="space-y-6">
    <header class="space-y-2" v-reveal="{ y: 12, duration: 0.45 }">
      <h1 class="page-title">{{ t("actions.title") }}</h1>
      <p class="max-w-prose text-base text-muted">{{ t("actions.subtitle") }}</p>
    </header>

    <ActionSearchIntent v-model="query" />

    <LoadingState v-if="isLoading" variant="skeleton-rows" :count="8" />

    <UAlert
      v-else-if="isError"
      class="rounded-lg"
      color="error"
      variant="subtle"
      :title="t('actions.hub.error')"
      :description="error?.message"
    >
      <template #actions>
        <UButton color="error" variant="soft" :label="t('actions.hub.retry')" @click="retry" />
      </template>
    </UAlert>

    <template v-else-if="showingSearch">
      <section class="space-y-3">
        <SectionHeader
          :title="t('actions.search.results')"
          icon="i-tabler-search"
          :count="displayItems.length"
        />

        <EmptyState
          v-if="displayItems.length === 0"
          icon="i-tabler-search-off"
          :title="t('actions.search.empty')"
        />
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
    </template>

    <template v-else>
      <section v-if="recommendedItems.length" class="space-y-3">
        <SectionHeader
          :title="t('actions.hub.recommended')"
          icon="i-tabler-sparkles"
          :count="recommendedItems.length"
        />
        <div
          v-reveal.stagger="{ y: 8, duration: 0.35 }"
          class="divide-y divide-default overflow-hidden rounded-lg border border-default"
        >
          <RecommendedActionCard
            v-for="item in recommendedItems"
            :key="item.id"
            data-reveal-item
            :item="item"
            :reason="item.recommendationReason"
            :company-id="props.companyId"
          />
        </div>
      </section>

      <section v-if="outstandingItems.length" class="space-y-3">
        <SectionHeader
          :title="t('actions.hub.outstanding')"
          icon="i-tabler-alert-circle"
          :count="outstandingItems.length"
        />
        <ActionOutstandingList :items="outstandingItems" :company-id="props.companyId" />
      </section>

      <section class="space-y-3">
        <SectionHeader
          :title="t('actions.hub.allActions')"
          icon="i-tabler-list-details"
          :count="t('actions.hub.count', { count: displayItems.length })"
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
        />
        <div v-else class="space-y-5">
          <div v-for="group in agencyGroups" :key="group.id" class="space-y-2">
            <div class="flex items-center gap-2 px-1">
              <h3 class="text-sm font-semibold text-toned">
                {{ agencyLabel(group.id) }}
              </h3>
              <UBadge color="neutral" variant="soft" size="sm">
                {{ group.items.length }}
              </UBadge>
            </div>
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
      </section>
    </template>
  </div>
</template>

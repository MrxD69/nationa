<script setup lang="ts">
import ActionAgencyNav from "~/components/action/ActionAgencyNav.vue";
import ActionCard from "~/components/action/ActionCard.vue";
import ActionOutstandingList from "~/components/action/ActionOutstandingList.vue";
import ActionSearchIntent from "~/components/action/ActionSearchIntent.vue";

const props = defineProps<{ companyId?: string }>();

const { t } = useI18n();
const actions = useActions();

const selectedAgency = ref<string | undefined>(undefined);
const query = ref("");

const queryRef = computed(() => query.value);
const companyRef = computed(() => props.companyId);
const searchEnabled = computed(() => query.value.trim().length > 0);

const catalog = actions.catalogQuery({ companyId: props.companyId });
const outstanding = actions.outstandingQuery({ companyId: props.companyId, limit: 5 });
const search = actions.searchQuery({
  query: queryRef,
  companyId: companyRef,
  enabled: searchEnabled,
});

const items = computed(() => catalog.data.value ?? []);
const outstandingItems = computed(() => outstanding.data.value ?? []);
const showingSearch = computed(() => query.value.trim().length > 0);
const searchItems = computed(() => search.data.value ?? []);

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

const displayItems = computed(() => {
  if (showingSearch.value) {
    return searchItems.value;
  }
  if (!selectedAgency.value) {
    return items.value;
  }
  return items.value.filter((item) => item.agencyId === selectedAgency.value);
});

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
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-2" v-reveal="{ y: 12, duration: 0.45 }">
      <h1 class="text-2xl font-semibold text-highlighted">{{ t("actions.title") }}</h1>
      <p class="text-sm text-muted">{{ t("actions.subtitle") }}</p>
    </div>

    <ActionSearchIntent v-model="query" />

    <div v-if="isLoading" class="flex items-center gap-2 text-sm text-muted">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>{{ t("actions.hub.loading") }}</span>
    </div>

    <UAlert
      v-else-if="isError"
      color="error"
      variant="subtle"
      :title="t('actions.hub.error')"
      :description="error?.message"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="sm"
          :label="t('actions.hub.retry')"
          @click="retry"
        />
      </template>
    </UAlert>

    <template v-else-if="showingSearch">
      <div class="space-y-1">
        <h2 class="text-sm font-semibold text-highlighted">{{ t("actions.search.results") }}</h2>
      </div>
      <div v-if="displayItems.length === 0" class="text-sm text-muted">
        {{ t("actions.search.empty") }}
      </div>
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ActionCard
          v-for="item in displayItems"
          :key="item.id"
          :item="item"
          :company-id="props.companyId"
        />
      </div>
    </template>

    <template v-else>
      <section v-if="outstandingItems.length" class="space-y-3">
        <h2 class="text-sm font-semibold text-highlighted">{{ t("actions.hub.outstanding") }}</h2>
        <ActionOutstandingList :items="outstandingItems" :company-id="props.companyId" />
      </section>

      <section class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-highlighted">{{ t("actions.hub.allActions") }}</h2>
          <ActionAgencyNav v-model="selectedAgency" :agencies="agencies" />
        </div>

        <div v-if="displayItems.length === 0" class="text-sm text-muted">
          {{ t("actions.hub.empty") }}
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ActionCard
            v-for="item in displayItems"
            :key="item.id"
            :item="item"
            :company-id="props.companyId"
          />
        </div>
      </section>
    </template>
  </div>
</template>

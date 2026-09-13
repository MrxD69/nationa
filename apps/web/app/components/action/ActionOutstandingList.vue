<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";
import type { ActionCatalogItem } from "~/composables/useActions";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";

const props = defineProps<{ items: ActionCatalogItem[]; companyId?: string }>();

const { locale, t } = useI18n();

function name(item: ActionCatalogItem): string {
  return locale.value === "ar" ? (item.nameAr ?? item.nameFr) : item.nameFr;
}

function to(item: ActionCatalogItem) {
  return {
    path: `/actions/${item.id}`,
    query: props.companyId ? { companyId: props.companyId } : {},
  };
}
</script>

<template>
  <div data-reveal-item>
    <div
      v-if="props.items.length === 0"
      class="rounded-md border border-dashed border-default px-5 py-4 text-base text-muted"
    >
      {{ t("actions.hub.outstandingEmpty") }}
    </div>

    <div v-else class="divide-y divide-default overflow-hidden rounded-md border border-default">
      <NuxtLink
        v-for="item in props.items"
        :key="item.id"
        :to="to(item)"
        class="hover-surface group flex items-center justify-between gap-4 px-5 py-4"
      >
        <AgencyMark :agency-id="item.agencyId" size="sm" />

        <div class="min-w-0 flex-1 space-y-0.5">
          <div class="truncate text-base font-medium text-highlighted">{{ name(item) }}</div>
          <div class="text-base text-muted">
            {{ t(`actions.agencies.${item.agencyId}`, item.agencyId) }}
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <ActionStatusBadge :state="item.status" />
          <UIcon
            name="i-tabler-chevron-right"
            class="size-6 text-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

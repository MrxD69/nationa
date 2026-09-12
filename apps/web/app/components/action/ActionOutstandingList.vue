<script setup lang="ts">
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
  <div class="grid gap-2" data-reveal-item>
    <div
      v-if="props.items.length === 0"
      class="rounded-lg border border-dashed border-default px-4 py-3 text-sm text-muted"
    >
      {{ t("actions.hub.outstandingEmpty") }}
    </div>

    <NuxtLink
      v-for="item in props.items"
      :key="item.id"
      :to="to(item)"
      class="group flex items-center justify-between gap-3 rounded-lg border border-default bg-elevated px-4 py-3 transition-colors hover:border-primary"
    >
      <div class="min-w-0 space-y-0.5">
        <div class="truncate text-sm font-medium text-highlighted">{{ name(item) }}</div>
        <div class="text-xs text-muted">
          {{ t(`actions.agencies.${item.agencyId}`, item.agencyId) }}
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <ActionStatusBadge :state="item.status" />
        <UIcon
          name="i-tabler-chevron-right"
          class="size-4 text-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        />
      </div>
    </NuxtLink>
  </div>
</template>

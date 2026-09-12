<script setup lang="ts">
import type { ActionCatalogItem } from "~/composables/useActions";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";

const props = defineProps<{ item: ActionCatalogItem; companyId?: string }>();

const { locale, t } = useI18n();

const name = computed(() =>
  locale.value === "ar" ? (props.item.nameAr ?? props.item.nameFr) : props.item.nameFr,
);

const agencyName = computed(() => {
  if (locale.value === "ar") {
    return props.item.agencyNameAr ?? props.item.agencyNameFr ?? props.item.agencyId;
  }
  return props.item.agencyNameFr ?? props.item.agencyId;
});

const to = computed(() => ({
  path: `/actions/${props.item.id}`,
  query: props.companyId ? { companyId: props.companyId } : {},
}));

const cta = computed(() =>
  props.item.status === "not_started" ? t("actions.hub.start") : t("actions.hub.open"),
);
</script>

<template>
  <UCard
    v-reveal="{ y: 12, duration: 0.4 }"
    class="flex h-full flex-col transition-shadow hover:shadow-md"
  >
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ t(`actions.agencies.${props.item.agencyId}`, props.item.agencyId) }}
            </UBadge>
            <span v-if="props.item.category" class="text-xs text-muted">
              {{ props.item.category }}
            </span>
          </div>
          <h3 class="truncate text-sm font-semibold text-highlighted" :title="name">
            {{ name }}
          </h3>
        </div>
        <ActionStatusBadge :state="props.item.status" />
      </div>
    </template>

    <div class="flex flex-1 flex-col gap-4">
      <p v-if="props.item.description" class="line-clamp-3 text-sm text-muted">
        {{ props.item.description }}
      </p>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span class="inline-flex items-center gap-1">
          <UIcon name="i-tabler-list-numbers" class="size-4" />
          {{ t("actions.hub.steps", { count: props.item.stepCount }) }}
        </span>
        <span v-if="props.item.estimatedDays" class="inline-flex items-center gap-1">
          <UIcon name="i-tabler-clock" class="size-4" />
          {{ t("actions.hub.days", { count: props.item.estimatedDays }) }}
        </span>
        <span class="inline-flex items-center gap-1">
          <UIcon name="i-tabler-file-text" class="size-4" />
          {{ t("actions.hub.docsRequired", { count: props.item.requiredDocumentCount }) }}
        </span>
      </div>

      <div class="mt-auto space-y-3">
        <UProgress :model-value="props.item.progress" size="sm" />
        <UButton
          :to="to"
          size="sm"
          block
          :variant="props.item.status === 'not_started' ? 'solid' : 'outline'"
          trailing-icon="i-tabler-arrow-right"
          :label="cta"
        />
      </div>
    </div>
  </UCard>
</template>

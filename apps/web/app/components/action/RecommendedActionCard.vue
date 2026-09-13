<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";
import type { ActionCatalogItem } from "~/composables/useActions";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";

const props = defineProps<{
  item: ActionCatalogItem;
  reason?: string | null;
  companyId?: string;
}>();

const { locale, t } = useI18n();

const name = computed(() =>
  locale.value === "ar" ? (props.item.nameAr ?? props.item.nameFr) : props.item.nameFr,
);

const agencyName = computed(() =>
  locale.value === "ar"
    ? (props.item.agencyNameAr ?? props.item.agencyNameFr ?? props.item.agencyId)
    : (props.item.agencyNameFr ?? props.item.agencyId),
);

const to = computed(() => ({
  path: `/actions/${props.item.id}`,
  query: props.companyId ? { companyId: props.companyId } : {},
}));

const cta = computed(() =>
  props.item.status === "not_started" ? t("actions.hub.start") : t("actions.hub.open"),
);
</script>

<template>
  <div class="hover-surface group relative border-s-2 border-s-primary bg-primary/5">
    <NuxtLink
      :to="to"
      class="absolute inset-0 z-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none"
      :aria-label="`${cta} — ${name}`"
    />

    <div class="pointer-events-none relative z-10 flex items-center gap-3 px-4 py-3">
      <AgencyMark :agency-id="props.item.agencyId" size="sm" :alt="agencyName" />

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="truncate text-base font-semibold text-highlighted" :title="name">
            {{ name }}
          </span>
          <UBadge color="primary" variant="subtle" size="sm" class="shrink-0">
            {{ t("actions.hub.recommendedBadge") }}
          </UBadge>
        </div>
        <p v-if="props.reason" class="mt-0.5 line-clamp-2 text-sm text-muted">
          {{ props.reason }}
        </p>
        <p v-else class="mt-0.5 text-sm text-muted">
          {{ t("actions.hub.steps", { count: props.item.stepCount }) }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <ActionStatusBadge
          v-if="props.item.status !== 'not_started'"
          :state="props.item.status"
          size="sm"
        />
        <span class="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {{ cta }}
          <UIcon
            name="i-tabler-chevron-right"
            class="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          />
        </span>
      </div>
    </div>
  </div>
</template>

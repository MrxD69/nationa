<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";
import type { ActionCatalogItem } from "~/composables/useActions";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";
import ActionWhenToUse from "~/components/action/ActionWhenToUse.vue";

const props = defineProps<{
  item: ActionCatalogItem;
  companyId?: string;
  showAgency?: boolean;
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

const cta = computed(() => {
  if (props.item.status === "not_started") return t("actions.hub.start");
  if (props.item.progress > 0 && props.item.progress < 100) return t("actions.hub.resume");
  return t("actions.hub.open");
});

const progress = computed(() => Math.min(100, Math.max(0, Math.round(props.item.progress))));
const showProgress = computed(() => props.item.status !== "not_started" || props.item.progress > 0);
</script>

<template>
  <div class="hover-surface group relative">
    <NuxtLink
      :to="to"
      class="absolute inset-0 z-0 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none"
      :aria-label="`${cta} — ${name}`"
    />

    <div class="pointer-events-none relative z-10 flex items-center gap-3 px-4 py-3">
      <AgencyMark :agency-id="props.item.agencyId" size="sm" :alt="agencyName" />

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <span class="truncate text-base font-semibold text-highlighted" :title="name">
            {{ name }}
          </span>
          <ActionWhenToUse
            class="pointer-events-auto shrink-0"
            :code="props.item.code"
            :description="props.item.description"
          />
        </div>

        <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
          <span v-if="props.showAgency" class="inline-flex items-center gap-1">
            <UIcon name="i-tabler-building" class="size-3.5 shrink-0" />
            {{ agencyName }}
          </span>
          <span class="inline-flex items-center gap-1">
            <UIcon name="i-tabler-list-numbers" class="size-3.5 shrink-0" />
            {{ t("actions.hub.steps", { count: props.item.stepCount }) }}
          </span>
          <span v-if="props.item.estimatedDays" class="inline-flex items-center gap-1">
            <UIcon name="i-tabler-clock" class="size-3.5 shrink-0" />
            {{ t("actions.hub.days", { count: props.item.estimatedDays }) }}
          </span>
          <span class="inline-flex items-center gap-1">
            <UIcon name="i-tabler-file-text" class="size-3.5 shrink-0" />
            {{ t("actions.hub.docsRequired", { count: props.item.requiredDocumentCount }) }}
          </span>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <div v-if="showProgress" class="hidden items-center gap-2 sm:flex">
          <UProgress :model-value="progress" size="sm" class="w-16" />
          <span class="tabular text-sm text-muted">{{ progress }}%</span>
        </div>

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

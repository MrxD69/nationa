<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";
import type { ActionCatalogItem } from "~/composables/useActions";
import ActionMeta from "~/components/action/ActionMeta.vue";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";

const props = defineProps<{
  item: ActionCatalogItem;
  companyId?: string;
  showAgency?: boolean;
  highlight?: boolean;
  reason?: string | null;
}>();

const { locale, t } = useI18n();
const actionPurpose = useActionPurpose();

const name = computed(() =>
  locale.value === "ar" ? (props.item.nameAr ?? props.item.nameFr) : props.item.nameFr,
);

const agencyName = computed(() =>
  locale.value === "ar"
    ? (props.item.agencyNameAr ?? props.item.agencyNameFr ?? props.item.agencyId)
    : (props.item.agencyNameFr ?? props.item.agencyId),
);

/*
 * The administrative name rarely tells a first-time filer what the démarche is
 * for, so the row leads with the plain-language sentence instead of hiding it
 * behind a tooltip nobody hovers.
 */
const purpose = computed(
  () => props.reason ?? actionPurpose(props.item.code, props.item.description),
);

const to = computed(() => ({
  path: `/actions/${props.item.id}`,
  query: props.companyId ? { companyId: props.companyId } : {},
}));

const progress = computed(() => Math.min(100, Math.max(0, Math.round(props.item.progress))));

const started = computed(() => props.item.status !== "not_started" || progress.value > 0);

const cta = computed(() => {
  if (!started.value) return t("actions.hub.start");
  if (progress.value < 100) return t("actions.hub.resume");
  return t("actions.hub.open");
});
</script>

<template>
  <div class="hover-surface group relative transition-control">
    <!-- One target for the whole row: the visible chrome stays inert so the
         hit area never breaks into competing links. -->
    <NuxtLink
      :to="to"
      class="absolute inset-0 z-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none"
      :aria-label="`${cta} — ${name}`"
    />

    <div class="pointer-events-none relative z-10 flex items-start gap-4 px-4 py-4 sm:px-5">
      <!-- When the row spells out the administration, the logo is decorative. -->
      <AgencyMark
        :agency-id="props.item.agencyId"
        size="sm"
        :alt="props.showAgency ? '' : agencyName"
        class="mt-0.5"
      />

      <div class="min-w-0 flex-1 space-y-1.5">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 class="min-w-0 text-base leading-6 font-semibold text-highlighted">
            {{ name }}
          </h3>
          <UBadge
            v-if="props.highlight"
            color="primary"
            variant="subtle"
            size="sm"
            class="shrink-0"
          >
            {{ t("actions.hub.recommendedBadge") }}
          </UBadge>
          <ActionStatusBadge v-if="started" :state="props.item.status" size="sm" class="shrink-0" />
        </div>

        <p class="line-clamp-2 text-sm leading-6 text-muted">{{ purpose }}</p>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span v-if="props.showAgency" class="inline-flex items-center gap-1.5 text-sm text-muted">
            <UIcon name="i-tabler-building-bank" class="size-4 shrink-0 text-dimmed" />
            {{ agencyName }}
          </span>
          <ActionMeta
            :steps="props.item.stepCount"
            :documents="props.item.requiredDocumentCount"
            :days="props.item.estimatedDays"
          />
        </div>

        <!-- Progress belongs under the title on narrow screens, where the
             right-hand column has collapsed away. -->
        <div v-if="started" class="flex items-center gap-2 pt-0.5 sm:hidden">
          <UProgress :model-value="progress" size="sm" class="max-w-40" />
          <span class="tabular text-sm text-muted">{{ progress }}%</span>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-4">
        <div v-if="started" class="hidden w-28 flex-col items-end gap-1 sm:flex">
          <span class="tabular text-sm font-medium text-toned">
            {{ t("actions.hub.progressLabel", { percent: progress }) }}
          </span>
          <UProgress :model-value="progress" size="sm" class="w-full" />
        </div>

        <span
          class="hidden items-center gap-1 rounded-md border border-default px-3 py-1.5 text-sm font-semibold text-primary transition-control group-hover:border-primary group-hover:bg-primary/5 sm:inline-flex"
        >
          {{ cta }}
          <UIcon
            name="i-tabler-chevron-right"
            class="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          />
        </span>

        <UIcon
          name="i-tabler-chevron-right"
          class="size-5 shrink-0 text-dimmed sm:hidden rtl:rotate-180"
        />
      </div>
    </div>
  </div>
</template>

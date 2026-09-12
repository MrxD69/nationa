<script setup lang="ts">
import type { ActionStep } from "~/composables/useActions";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";

const props = defineProps<{
  step: ActionStep | null;
  caseId: string | null;
  running?: boolean;
}>();

const emit = defineEmits<{ (event: "run-checks"): void }>();

const { locale, t } = useI18n();

const title = computed(() => {
  if (!props.step) {
    return "";
  }
  if (locale.value === "ar") {
    return props.step.titleAr ?? props.step.titleFr;
  }
  return props.step.titleFr;
});
</script>

<template>
  <UCard variant="subtle" v-reveal="{ y: 10, duration: 0.4 }">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 space-y-1">
        <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          <UIcon name="i-tabler-arrow-right-circle" class="size-4" />
          <span>{{ t("actions.tracker.nextAction") }}</span>
        </div>

        <template v-if="props.step">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-highlighted">{{ title }}</span>
            <ActionStatusBadge :state="props.step.state" size="xs" />
          </div>
          <p v-if="props.step.description" class="text-sm text-muted">
            {{ props.step.description }}
          </p>
        </template>
        <p v-else class="text-sm text-muted">{{ t("actions.tracker.noNext") }}</p>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <UButton
          v-if="props.caseId"
          :to="`/cases/${props.caseId}`"
          size="sm"
          variant="outline"
          icon="i-tabler-external-link"
          :label="t('actions.tracker.openCase')"
        />
        <UButton
          v-if="props.caseId"
          size="sm"
          icon="i-tabler-shield-check"
          :loading="props.running"
          :disabled="props.running"
          :label="props.running ? t('actions.tracker.running') : t('actions.tracker.runChecks')"
          @click="emit('run-checks')"
        />
      </div>
    </div>
  </UCard>
</template>

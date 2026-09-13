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
  <!--
    A banded section, not a card: this is the top of the same timeline that
    follows it. The description is clamped because the step below repeats it in
    full, and two copies of the same paragraph read as noise.
  -->
  <section
    class="rounded-lg border-s-4 border-s-primary bg-primary/5 px-5 py-4"
    v-reveal="{ y: 10, duration: 0.4 }"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 space-y-1.5">
        <div
          class="flex items-center gap-2 text-base font-semibold tracking-wide text-muted uppercase"
        >
          <UIcon name="i-tabler-arrow-right-circle" class="size-6" />
          <span>{{ t("actions.tracker.nextAction") }}</span>
        </div>

        <template v-if="props.step">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-lg font-semibold text-highlighted">{{ title }}</span>
            <ActionStatusBadge
              v-if="props.step.state !== 'not_started'"
              :state="props.step.state"
              size="lg"
            />
          </div>
          <p v-if="props.step.description" class="line-clamp-2 text-base text-muted">
            {{ props.step.description }}
          </p>
        </template>
        <p v-else class="text-base text-muted">{{ t("actions.tracker.noNext") }}</p>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <UButton
          v-if="props.caseId"
          :to="`/cases/${props.caseId}`"
          variant="outline"
          icon="i-tabler-external-link"
          :label="t('actions.tracker.openCase')"
        />
        <UButton
          v-if="props.caseId"
          icon="i-tabler-shield-check"
          :loading="props.running"
          :disabled="props.running"
          :label="props.running ? t('actions.tracker.running') : t('actions.tracker.runChecks')"
          @click="emit('run-checks')"
        />
      </div>
    </div>
  </section>
</template>

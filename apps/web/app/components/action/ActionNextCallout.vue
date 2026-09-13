<script setup lang="ts">
import type { ActionStep } from "~/composables/useActions";
import ActionDescription from "~/components/action/ActionDescription.vue";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";

const props = defineProps<{
  step: ActionStep | null;
  total?: number;
  caseId: string | null;
  running?: boolean;
  starting?: boolean;
}>();

const emit = defineEmits<{ (event: "run-checks"): void; (event: "start"): void }>();

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

const position = computed(() =>
  props.step && props.total
    ? t("actions.tracker.stepOf", { position: props.step.position, total: props.total })
    : "",
);
</script>

<template>
  <!--
    A plain white panel, not a tinted band: the only colour on this page is the
    primary button, and the numbered disc ties the panel to the same timeline
    that follows it. Only the first few points of the instruction appear here,
    because the step below repeats it in full and two copies of a twenty-six
    item checklist read as noise.
  -->
  <section
    class="rounded-lg border border-default bg-default p-5 shadow-card"
    v-reveal="{ y: 10, duration: 0.4 }"
  >
    <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-5">
      <div class="flex min-w-0 flex-1 items-start gap-4">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-full border border-default"
          :class="props.step ? 'text-toned' : 'text-success'"
        >
          <span v-if="props.step" class="tabular text-base font-semibold">
            {{ props.step.position }}
          </span>
          <UIcon v-else name="i-tabler-check" class="size-5" />
        </span>

        <div class="min-w-0 space-y-2">
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="text-xs font-semibold tracking-wide text-dimmed uppercase">
              {{ t("actions.tracker.nextAction") }}
            </span>
            <span v-if="position" class="tabular text-xs text-dimmed">· {{ position }}</span>
          </p>

          <template v-if="props.step">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg leading-6 font-semibold text-highlighted">{{ title }}</h2>
              <ActionStatusBadge
                v-if="props.step.state !== 'not_started'"
                :state="props.step.state"
                size="sm"
              />
            </div>
            <ActionDescription
              v-if="props.step.description"
              :text="props.step.description"
              :max="3"
            />
          </template>
          <p v-else class="text-base leading-7 text-muted">{{ t("actions.tracker.noNext") }}</p>

          <p v-if="!props.caseId" class="max-w-prose text-base leading-7 text-muted">
            {{ t("actions.tracker.notStartedHint") }}
          </p>
        </div>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <template v-if="props.caseId">
          <UButton
            :to="`/cases/${props.caseId}`"
            icon="i-tabler-arrow-right"
            :label="t('actions.tracker.openCase')"
            :ui="{ leadingIcon: 'rtl:rotate-180' }"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-tabler-shield-check"
            :loading="props.running"
            :disabled="props.running"
            :label="props.running ? t('actions.tracker.running') : t('actions.tracker.runChecks')"
            @click="emit('run-checks')"
          />
        </template>
        <UButton
          v-else
          size="lg"
          icon="i-tabler-player-play"
          :loading="props.starting"
          :disabled="props.starting"
          :label="t('actions.tracker.startCase')"
          @click="emit('start')"
        />
      </div>
    </div>
  </section>
</template>

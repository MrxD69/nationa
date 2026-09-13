<script setup lang="ts">
type SubmissionStep = {
  id: string;
  position: number;
  status: string;
  template?: { titleFr: string; titleAr?: string | null; isOptional?: boolean } | null;
};

const props = defineProps<{
  caseId: string;
  steps: SubmissionStep[];
  submitting?: boolean;
  ready?: boolean;
}>();

const emit = defineEmits<{ (event: "submit"): void }>();

const { locale, t } = useI18n();

function title(step: SubmissionStep): string {
  if (locale.value === "ar") {
    return step.template?.titleAr ?? step.template?.titleFr ?? `#${step.position}`;
  }
  return step.template?.titleFr ?? `#${step.position}`;
}

function isReady(step: SubmissionStep): boolean {
  return step.status === "completed" || step.status === "skipped";
}
</script>

<template>
  <div class="grid gap-4">
    <div class="grid gap-2">
      <h3 class="text-base font-medium text-highlighted">{{ t("cases.submission.checklist") }}</h3>
      <div
        v-for="step in props.steps"
        :key="step.id"
        class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2"
      >
        <div class="flex min-w-0 items-center gap-2">
          <UIcon
            :name="isReady(step) ? 'i-tabler-square-rounded-check' : 'i-tabler-clock'"
            :class="isReady(step) ? 'text-success' : 'text-muted'"
            class="size-4 shrink-0"
          />
          <span class="truncate text-base">{{ title(step) }}</span>
        </div>
        <UBadge :color="isReady(step) ? 'success' : 'neutral'" variant="subtle" size="lg">
          {{ t(`cases.stepStatus.${step.status}`, step.status) }}
        </UBadge>
      </div>
    </div>

    <UButton
      color="primary"
      icon="i-tabler-send"
      block
      :loading="props.submitting"
      :disabled="!props.ready"
      :label="t('cases.submission.submit')"
      @click="emit('submit')"
    />
  </div>
</template>

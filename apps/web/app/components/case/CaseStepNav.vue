<script setup lang="ts">
type NavStep = {
  id: string;
  position: number;
  status: string;
  template?: { titleFr: string; titleAr?: string | null } | null;
};

const props = defineProps<{
  steps: NavStep[];
  modelValue: number;
}>();

const emit = defineEmits<{ (event: "update:modelValue", value: number): void }>();

const { locale, t } = useI18n();

const STATUS_ICONS: Record<string, string> = {
  locked: "i-tabler-lock",
  available: "i-tabler-circle",
  in_progress: "i-tabler-progress",
  completed: "i-tabler-circle-check",
  skipped: "i-tabler-player-skip-forward",
};

function title(step: NavStep): string {
  if (locale.value === "ar") {
    return step.template?.titleAr ?? step.template?.titleFr ?? `#${step.position}`;
  }
  return step.template?.titleFr ?? `#${step.position}`;
}

const items = computed(() =>
  props.steps.map((step, index) => ({
    value: index,
    title: title(step),
    description: t(`cases.stepStatus.${step.status}`, step.status),
    icon: STATUS_ICONS[step.status] ?? "i-tabler-circle",
    disabled: step.status === "locked",
  })),
);
</script>

<template>
  <UStepper
    :model-value="props.modelValue"
    :items="items"
    orientation="vertical"
    @update:model-value="emit('update:modelValue', Number($event))"
  />
</template>

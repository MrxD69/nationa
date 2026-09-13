<script setup lang="ts">
import type { ActionStepState } from "~/composables/useActions";

const props = defineProps<{
  state: ActionStepState | string;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
}>();

const { t } = useI18n();

const COLORS: Record<string, "primary" | "info" | "success" | "warning" | "error" | "neutral"> = {
  not_started: "neutral",
  in_progress: "info",
  done: "success",
  verified: "success",
  generated: "primary",
  needs_correction: "warning",
  blocked: "error",
  locked: "neutral",
};

const color = computed(() => COLORS[props.state] ?? "neutral");
const text = computed(() => props.label ?? t(`actions.state.${props.state}`, props.state));
</script>

<template>
  <UBadge :color="color" variant="subtle" :size="props.size ?? 'lg'">{{ text }}</UBadge>
</template>

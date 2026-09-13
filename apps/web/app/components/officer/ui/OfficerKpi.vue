<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    icon: string;
    label: string;
    value: string;
    hint?: string | null;
    tone?: "neutral" | "success" | "warning" | "error";
  }>(),
  { hint: null, tone: "neutral" },
);

const toneClass = computed(() => {
  switch (props.tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "error":
      return "text-error";
    default:
      return "text-muted";
  }
});
</script>

<template>
  <div class="flex items-center gap-3 py-2" role="group" :aria-label="label">
    <UIcon :name="icon" class="size-5 shrink-0" :class="toneClass" aria-hidden="true" />

    <div class="min-w-0">
      <p class="text-sm text-muted">{{ label }}</p>
      <p class="tabular text-lg font-semibold text-highlighted">{{ value }}</p>
      <p v-if="hint" class="text-xs text-dimmed">{{ hint }}</p>
    </div>
  </div>
</template>

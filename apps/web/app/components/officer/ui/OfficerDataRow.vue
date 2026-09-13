<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    value?: string | number | null;
    mono?: boolean;
  }>(),
  { value: null, mono: false },
);

const display = computed(() => {
  const value = props.value;
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return value;
});
</script>

<template>
  <div
    class="flex items-baseline justify-between gap-4 border-b border-muted/60 py-1.5 last:border-0"
  >
    <span class="text-sm text-muted">{{ label }}</span>
    <span class="min-w-0 text-end text-sm text-highlighted" :dir="mono ? 'ltr' : undefined">
      <slot>{{ display }}</slot>
    </span>
  </div>
</template>

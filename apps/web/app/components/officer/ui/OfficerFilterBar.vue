<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string | null;
  }>(),
  { label: null },
);
</script>

<template>
  <div class="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-default pb-3">
    <p v-if="label" class="text-sm font-medium text-muted">{{ label }}</p>

    <div class="flex flex-1 flex-wrap items-end gap-x-4 gap-y-3">
      <slot />
    </div>

    <div v-if="$slots.actions" class="ms-auto flex flex-wrap items-end gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

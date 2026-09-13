<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    description?: string;
    size?: "sm" | "md";
  }>(),
  { icon: "i-tabler-inbox", size: "md" },
);
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-default px-6 text-center"
    :class="size === 'sm' ? 'py-8' : 'py-12'"
  >
    <slot name="icon">
      <div class="flex size-12 items-center justify-center rounded-full bg-accented text-muted">
        <UIcon :name="icon" class="size-6" />
      </div>
    </slot>

    <div class="space-y-1">
      <p class="text-base font-semibold text-highlighted">{{ title }}</p>
      <p v-if="description" class="text-base text-muted">{{ description }}</p>
    </div>

    <div v-if="$slots.default" class="flex flex-wrap items-center justify-center gap-2">
      <slot />
    </div>
  </div>
</template>

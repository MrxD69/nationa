<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    icon?: string;
    description?: string;
    count?: number | string;
    level?: 2 | 3;
  }>(),
  { level: 2 },
);

const headingTag = computed(() => `h${props.level}`);
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div class="min-w-0 space-y-0.5">
      <div class="flex items-center gap-2">
        <UIcon v-if="icon" :name="icon" class="size-5 shrink-0 text-muted" />
        <component :is="headingTag" class="text-lg font-semibold text-highlighted">
          {{ title }}
        </component>
        <UBadge
          v-if="count !== undefined"
          color="neutral"
          variant="soft"
          size="lg"
          class="shrink-0"
        >
          {{ count }}
        </UBadge>
      </div>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>

    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: "spinner" | "skeleton-list" | "skeleton-grid" | "skeleton-rows";
    count?: number;
    label?: string;
  }>(),
  { variant: "spinner", count: 3 },
);

const { t } = useI18n();

const resolvedLabel = computed(() => props.label ?? t("common.loading"));
</script>

<template>
  <div aria-busy="true">
    <div
      v-if="variant === 'spinner'"
      class="flex flex-col items-center justify-center gap-3 py-10"
      role="status"
    >
      <UIcon name="i-tabler-loader-2" class="size-6 animate-spin text-muted" />
      <p class="text-base text-muted">{{ resolvedLabel }}</p>
    </div>

    <div v-else-if="variant === 'skeleton-list'" class="space-y-3">
      <span class="sr-only">{{ resolvedLabel }}</span>
      <USkeleton v-for="n in count" :key="n" class="h-16 w-full rounded-lg" />
    </div>

    <div v-else-if="variant === 'skeleton-rows'" class="space-y-2">
      <span class="sr-only">{{ resolvedLabel }}</span>
      <USkeleton v-for="n in count" :key="n" class="h-10 w-full rounded-md" />
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <span class="sr-only">{{ resolvedLabel }}</span>
      <USkeleton v-for="n in count" :key="n" class="h-40 rounded-lg" />
    </div>
  </div>
</template>

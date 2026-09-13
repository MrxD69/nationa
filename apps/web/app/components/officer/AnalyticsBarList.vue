<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    items: Array<{ label: string; value: number; hint?: string }>;
    emptyLabel?: string;
  }>(),
  { emptyLabel: "" },
);

const max = computed(() => Math.max(...props.items.map((item) => item.value), 1));
</script>

<template>
  <section class="space-y-3 border-t border-default pt-4">
    <h2 class="text-sm font-semibold text-highlighted">{{ title }}</h2>

    <p v-if="items.length === 0" class="text-base text-muted">{{ emptyLabel }}</p>

    <ul v-else class="space-y-3">
      <li v-for="item in items" :key="item.label" class="space-y-1">
        <div class="flex items-center justify-between gap-3 text-sm">
          <span class="truncate text-toned">{{ item.label }}</span>
          <span class="shrink-0 font-medium text-muted">{{ item.hint ?? item.value }}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-elevated">
          <div
            class="h-full rounded-full bg-inverted"
            :style="{ width: `${Math.round((item.value / max) * 100)}%` }"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

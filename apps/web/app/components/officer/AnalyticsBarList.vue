<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    items: Array<{ label: string; value: number; hint?: string }>;
    emptyLabel?: string;
    description?: string;
    valueSuffix?: string;
  }>(),
  { emptyLabel: "", description: "", valueSuffix: "" },
);

const max = computed(() => Math.max(...props.items.map((item) => item.value), 1));

function displayValue(item: { value: number; hint?: string }): string {
  return item.hint ?? `${item.value}${props.valueSuffix}`;
}
</script>

<template>
  <section class="space-y-2 border-t border-default pt-3">
    <div class="space-y-0.5">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">{{ title }}</h2>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>

    <p v-if="items.length === 0" class="text-sm text-muted">{{ emptyLabel }}</p>

    <ul v-else class="divide-y divide-default">
      <li v-for="item in items" :key="item.label" class="space-y-1 py-2">
        <div class="flex items-center justify-between gap-3 text-sm">
          <span class="truncate text-toned">{{ item.label }}</span>
          <span class="shrink-0 tabular font-medium text-muted">{{ displayValue(item) }}</span>
        </div>
        <div class="h-1 overflow-hidden rounded-full bg-accented">
          <div
            class="h-full rounded-full bg-inverted"
            :style="{ width: `${Math.round((item.value / max) * 100)}%` }"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

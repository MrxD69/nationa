<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    items: Array<{ date: string; value: number }>;
    emptyLabel?: string;
    valueSuffix?: string;
    description?: string;
  }>(),
  { emptyLabel: "", valueSuffix: "", description: "" },
);

const max = computed(() => Math.max(...props.items.map((item) => item.value), 1));

function shortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
</script>

<template>
  <section class="space-y-2 border-t border-default pt-3">
    <div class="space-y-0.5">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">{{ title }}</h2>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>

    <p v-if="items.length === 0" class="text-sm text-muted">{{ emptyLabel }}</p>

    <div v-else class="flex h-20 items-end gap-1.5 overflow-x-auto">
      <div
        v-for="item in items"
        :key="item.date"
        class="flex min-w-7 flex-1 flex-col items-center gap-1"
      >
        <span class="text-xs tabular text-muted"> {{ item.value }}{{ valueSuffix }} </span>
        <div
          class="w-full rounded-t bg-inverted"
          :style="{ height: `${Math.max((item.value / max) * 80, 3)}px` }"
        />
        <span class="text-xs text-muted">{{ shortDate(item.date) }}</span>
      </div>
    </div>
  </section>
</template>

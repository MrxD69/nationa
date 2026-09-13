<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    items: Array<{ date: string; value: number }>;
    emptyLabel?: string;
    valueSuffix?: string;
  }>(),
  { emptyLabel: "", valueSuffix: "" },
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
  <section class="space-y-3 border-t border-default pt-4">
    <h2 class="text-sm font-semibold text-highlighted">{{ title }}</h2>

    <p v-if="items.length === 0" class="text-base text-muted">{{ emptyLabel }}</p>

    <div v-else class="flex h-40 items-end gap-2 overflow-x-auto">
      <div
        v-for="item in items"
        :key="item.date"
        class="flex min-w-8 flex-1 flex-col items-center gap-1"
      >
        <span class="text-[0.625rem] text-muted"> {{ item.value }}{{ valueSuffix }} </span>
        <div
          class="w-full rounded-t bg-inverted"
          :style="{ height: `${Math.max((item.value / max) * 120, 4)}px` }"
        />
        <span class="text-[0.625rem] text-muted">{{ shortDate(item.date) }}</span>
      </div>
    </div>
  </section>
</template>

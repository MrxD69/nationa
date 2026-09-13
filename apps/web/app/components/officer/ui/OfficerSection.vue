<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    description?: string | null;
    icon?: string | null;
    count?: number | string | null;
  }>(),
  { description: null, icon: null, count: null },
);

const hasCount = computed(
  () => props.count !== null && props.count !== undefined && props.count !== "",
);
</script>

<template>
  <section class="pt-6 first:pt-0">
    <div class="flex flex-wrap items-center gap-x-2 gap-y-2">
      <UIcon v-if="icon" :name="icon" class="size-4 shrink-0 text-muted" />

      <h2
        class="flex min-w-0 flex-wrap items-center gap-2 text-base font-semibold text-highlighted"
      >
        <span>{{ title }}</span>
        <UBadge v-if="hasCount" color="neutral" variant="soft">{{ count }}</UBadge>
      </h2>

      <div v-if="$slots.actions" class="ms-auto flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <p v-if="description" class="max-w-[70ch] text-sm text-muted">{{ description }}</p>

    <div class="pt-3">
      <slot />
    </div>
  </section>
</template>

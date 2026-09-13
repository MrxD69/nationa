<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    position?: "bottom" | "top";
    sticky?: boolean;
    bordered?: boolean;
  }>(),
  { position: "bottom", sticky: true, bordered: true },
);

const barClass = computed(() => [
  "z-20 flex flex-wrap items-center justify-between gap-2 bg-default/90 px-4 py-3 backdrop-blur sm:rounded-lg",
  props.sticky ? "sticky" : "relative",
  props.position === "bottom"
    ? "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    : "top-0 pt-[max(0.75rem,env(safe-area-inset-top))]",
  props.bordered
    ? props.position === "bottom"
      ? "border-t border-default sm:border"
      : "border-b border-default sm:border"
    : "",
]);
</script>

<template>
  <div :class="barClass">
    <div v-if="$slots.secondary" class="flex flex-wrap items-center gap-2">
      <slot name="secondary" />
    </div>
    <div v-if="$slots.default" class="ms-auto flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>

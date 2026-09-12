<script setup lang="ts">
const props = defineProps<{ value: number; size?: number; label?: string }>();

const { t } = useI18n();

const dimensions = computed(() => {
  const size = props.size ?? 72;
  const stroke = Math.max(4, Math.round(size / 12));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.min(100, Math.max(0, Math.round(props.value)));
  return {
    size,
    stroke,
    radius,
    circumference,
    value,
    offset: circumference * (1 - value / 100),
    center: size / 2,
  };
});
</script>

<template>
  <div
    class="inline-flex flex-col items-center gap-1"
    role="img"
    :aria-label="`${props.label ?? t('actions.tracker.progress')}: ${dimensions.value}%`"
  >
    <div
      class="relative"
      :style="{ width: `${dimensions.size}px`, height: `${dimensions.size}px` }"
    >
      <svg class="size-full -rotate-90" :viewBox="`0 0 ${dimensions.size} ${dimensions.size}`">
        <circle
          :cx="dimensions.center"
          :cy="dimensions.center"
          :r="dimensions.radius"
          fill="none"
          :stroke-width="dimensions.stroke"
          stroke="var(--ui-border)"
        />
        <circle
          class="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          :cx="dimensions.center"
          :cy="dimensions.center"
          :r="dimensions.radius"
          fill="none"
          :stroke-width="dimensions.stroke"
          stroke="var(--ui-primary)"
          stroke-linecap="round"
          :stroke-dasharray="dimensions.circumference"
          :stroke-dashoffset="dimensions.offset"
        />
      </svg>
      <span
        class="absolute inset-0 flex items-center justify-center text-sm font-semibold text-highlighted"
      >
        {{ dimensions.value }}%
      </span>
    </div>
    <span v-if="props.label" class="text-xs text-muted">{{ props.label }}</span>
  </div>
</template>

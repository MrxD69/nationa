<script setup lang="ts">
type StatTone = "neutral" | "success" | "warning" | "error";

type StatItem = {
  key: string;
  label: string;
  value: string;
  hint?: string | null;
  tone?: StatTone;
  active?: boolean;
  selectable?: boolean;
};

defineProps<{ items: StatItem[] }>();

const emit = defineEmits<{ select: [key: string] }>();

function valueTone(tone: StatTone | undefined, active: boolean) {
  if (active) return "text-primary";
  switch (tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "error":
      return "text-error";
    default:
      return "text-highlighted";
  }
}
</script>

<template>
  <div class="flex flex-wrap items-stretch divide-x divide-default border-b border-default">
    <template v-for="item in items" :key="item.key">
      <button
        v-if="item.selectable"
        type="button"
        class="group relative flex min-h-11 min-w-[8rem] flex-1 flex-col justify-center px-4 py-2 text-start transition-colors hover:bg-accented/40"
        :aria-pressed="!!item.active"
        @click="emit('select', item.key)"
      >
        <span
          class="tabular text-xl font-semibold leading-tight"
          :class="valueTone(item.tone, !!item.active)"
        >
          {{ item.value }}
        </span>
        <span class="text-sm" :class="item.active ? 'text-primary' : 'text-muted'">
          {{ item.label }}
        </span>
        <span v-if="item.hint" class="text-xs text-dimmed">{{ item.hint }}</span>
        <span
          v-if="item.active"
          class="absolute inset-x-3 bottom-0 h-0.5 bg-primary"
          aria-hidden="true"
        />
      </button>

      <div v-else class="flex min-w-[8rem] flex-1 flex-col justify-center px-4 py-2">
        <span
          class="tabular text-xl font-semibold leading-tight"
          :class="valueTone(item.tone, !!item.active)"
        >
          {{ item.value }}
        </span>
        <span class="text-sm" :class="item.active ? 'text-primary' : 'text-muted'">
          {{ item.label }}
        </span>
        <span v-if="item.hint" class="text-xs text-dimmed">{{ item.hint }}</span>
      </div>
    </template>
  </div>
</template>

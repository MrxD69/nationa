<script setup lang="ts">
import { parseChecklist } from "~/utils/checklist";

/**
 * Renders a step description the way it was actually written: prose stays a
 * paragraph, a flattened checklist becomes a list. `max` truncates long lists
 * where the full text would drown the surrounding UI — the step itself always
 * shows every point.
 */
const props = defineProps<{
  text?: string | null;
  max?: number;
}>();

const { t } = useI18n();

const checklist = computed(() => parseChecklist(props.text));

const visibleItems = computed(() =>
  props.max ? checklist.value.items.slice(0, props.max) : checklist.value.items,
);

const hiddenCount = computed(() => checklist.value.items.length - visibleItems.value.length);

/* Two columns once a list is long enough that one column would scroll away. */
const twoColumns = computed(() => visibleItems.value.length > 6);
</script>

<template>
  <div v-if="checklist.items.length" class="space-y-2">
    <p v-if="checklist.lead" class="max-w-prose text-base leading-7 text-toned">
      {{ checklist.lead }}
    </p>

    <ul
      class="m-0 grid list-none gap-x-8 gap-y-1.5 p-0"
      :class="twoColumns ? 'sm:grid-cols-2' : ''"
    >
      <li
        v-for="(item, index) in visibleItems"
        :key="`${index}-${item}`"
        class="flex items-start gap-2 text-base leading-7 text-toned"
      >
        <UIcon name="i-tabler-point-filled" class="mt-2.5 size-2.5 shrink-0 text-dimmed" />
        <span class="min-w-0">{{ item }}</span>
      </li>
    </ul>

    <p v-if="hiddenCount > 0" class="text-sm text-dimmed">
      {{ t("actions.step.moreItems", { count: hiddenCount }, hiddenCount) }}
    </p>
  </div>

  <p v-else-if="checklist.lead" class="max-w-prose text-base leading-7 text-toned">
    {{ checklist.lead }}
  </p>
</template>

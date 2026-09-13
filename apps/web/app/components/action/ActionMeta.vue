<script setup lang="ts">
/**
 * The three facts that decide whether someone can start a démarche today: how
 * many steps it takes, how many documents to gather, and how long the
 * administration takes. Always in that order, so the eye learns one pattern.
 */
const props = withDefaults(
  defineProps<{
    steps?: number | null;
    documents?: number | null;
    days?: number | null;
    size?: "sm" | "base";
  }>(),
  { size: "sm" },
);

const { t } = useI18n();

type MetaEntry = { key: string; icon: string; label: string };

const entries = computed<MetaEntry[]>(() => {
  const list: MetaEntry[] = [];

  if (typeof props.steps === "number" && props.steps > 0) {
    list.push({
      key: "steps",
      icon: "i-tabler-list-numbers",
      label: t("actions.hub.steps", { count: props.steps }, props.steps),
    });
  }

  if (typeof props.documents === "number") {
    list.push({
      key: "documents",
      icon: "i-tabler-file-text",
      label: t("actions.hub.docsRequired", { count: props.documents }, props.documents),
    });
  }

  if (typeof props.days === "number" && props.days > 0) {
    list.push({
      key: "days",
      icon: "i-tabler-clock",
      label: t("actions.hub.days", { count: props.days }, props.days),
    });
  }

  return list;
});
</script>

<template>
  <ul
    v-if="entries.length"
    class="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-muted"
    :class="props.size === 'base' ? 'text-base' : 'text-sm'"
  >
    <li v-for="entry in entries" :key="entry.key" class="inline-flex items-center gap-1.5">
      <UIcon :name="entry.icon" class="size-4 shrink-0 text-dimmed" />
      <span class="tabular">{{ entry.label }}</span>
    </li>
  </ul>
</template>

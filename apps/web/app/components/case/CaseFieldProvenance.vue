<script setup lang="ts">
type Provenance = Record<string, unknown>;

const props = defineProps<{ provenance?: Provenance[] }>();
const { t } = useI18n();

const colors: Record<string, "primary" | "info" | "secondary" | "neutral" | "warning"> = {
  user: "primary",
  document: "info",
  ai: "secondary",
  import: "neutral",
  system: "warning",
};

function kindOf(entry: Provenance): string {
  return typeof entry.sourceKind === "string" ? entry.sourceKind : "system";
}

function label(kind: string): string {
  return t(`cases.provenance.${kind}`, kind);
}

function confidence(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}%` : null;
}
</script>

<template>
  <div v-if="props.provenance?.length" class="flex flex-wrap items-center gap-1">
    <UBadge
      v-for="(entry, index) in props.provenance"
      :key="`${kindOf(entry)}-${index}`"
      :color="colors[kindOf(entry)] ?? 'neutral'"
      variant="subtle"
      size="lg"
    >
      {{ label(kindOf(entry)) }}
      <span v-if="confidence(entry.confidence)">· {{ confidence(entry.confidence) }}</span>
    </UBadge>
  </div>
</template>

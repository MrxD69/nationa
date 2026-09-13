<script setup lang="ts">
type SlaBucket = "on_time" | "at_risk" | "breached" | "unknown";

const props = withDefaults(
  defineProps<{
    bucket: SlaBucket;
    days?: number | null;
    dueAt?: string | Date | null;
  }>(),
  { days: null, dueAt: null },
);

const { t, te } = useI18n();

type SlaConfig = {
  color: "success" | "warning" | "error" | "neutral";
  icon: string;
  key: string;
  fallback: string;
};

const config = computed<SlaConfig>(() => {
  switch (props.bucket) {
    case "on_time":
      return {
        color: "success",
        icon: "i-tabler-clock-check",
        key: "officerOps.sla.onTime",
        fallback: "Délai respecté",
      };
    case "at_risk":
      return {
        color: "warning",
        icon: "i-tabler-clock-exclamation",
        key: "officerOps.sla.atRisk",
        fallback: "Échéance proche",
      };
    case "breached":
      return {
        color: "error",
        icon: "i-tabler-alarm",
        key: "officerOps.sla.breached",
        fallback: "Hors délai",
      };
    default:
      return {
        color: "neutral",
        icon: "i-tabler-clock",
        key: "officerOps.sla.unknown",
        fallback: "—",
      };
  }
});

const label = computed(() => (te(config.value.key) ? t(config.value.key) : config.value.fallback));

const daysLabel = computed(() => {
  if (typeof props.days !== "number") {
    return null;
  }
  if (te("officerOps.sla.days")) {
    return t("officerOps.sla.days", { count: props.days });
  }
  return props.days >= 0 ? `dans ${props.days} j` : `retard de ${Math.abs(props.days)} j`;
});

const title = computed(() => {
  if (!props.dueAt) {
    return undefined;
  }
  const date = props.dueAt instanceof Date ? props.dueAt : new Date(props.dueAt);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
});
</script>

<template>
  <UBadge :color="config.color" variant="subtle" :icon="config.icon" class="gap-1.5" :title="title">
    <span>{{ label }}</span>
    <span v-if="daysLabel" class="text-xs">{{ daysLabel }}</span>
  </UBadge>
</template>

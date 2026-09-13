<script setup lang="ts">
// Intentionally a no-op: operational pages no longer display KPI/stat strips
// (and card chrome is not allowed). Props/emits are kept intact so any importer
// still type-checks and behaves harmlessly.

type Counts = {
  total: number;
  breached: number;
  atRisk: number;
  onTime: number;
  unassigned: number;
  mine: number;
  returned: number;
};

type Selection = {
  slaBucket?: "on_time" | "at_risk" | "breached";
  assignment?: "mine" | "unassigned";
  status?: string;
};

withDefaults(
  defineProps<{
    counts: Counts;
    active?: { slaBucket?: string; assignment?: string; status?: string };
    loading?: boolean;
  }>(),
  { active: () => ({}), loading: false },
);

defineEmits<{ select: [selection: Selection] }>();
</script>

<template>
  <!-- Renders nothing on purpose. -->
</template>

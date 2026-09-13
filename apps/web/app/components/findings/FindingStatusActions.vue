<script setup lang="ts">
type FindingStatus = "open" | "resolved" | "waived" | "acknowledged";

const props = defineProps<{
  status: FindingStatus;
  busy?: boolean;
}>();

const emit = defineEmits<{
  change: [status: FindingStatus];
}>();

const { t } = useI18n();

const actions = computed(() =>
  (
    [
      { status: "resolved" as const, icon: "i-tabler-circle-check" },
      { status: "acknowledged" as const, icon: "i-tabler-eye" },
      { status: "waived" as const, icon: "i-tabler-flag-off" },
      { status: "open" as const, icon: "i-tabler-reload" },
    ] satisfies Array<{ status: FindingStatus; icon: string }>
  ).filter((action) => action.status !== props.status),
);

const LABEL_KEYS: Record<FindingStatus, string> = {
  resolved: "checks.actions.resolve",
  acknowledged: "checks.actions.acknowledge",
  waived: "checks.actions.waive",
  open: "checks.actions.reopen",
};
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <UButton
      v-for="action in actions"
      :key="action.status"
      :icon="action.icon"
      color="neutral"
      variant="soft"
      size="lg"
      :loading="busy"
      @click="emit('change', action.status)"
    >
      {{ t(LABEL_KEYS[action.status]) }}
    </UButton>
  </div>
</template>

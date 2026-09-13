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

type ConfirmCopy = {
  titleKey: string;
  bodyKey: string;
  confirmKey: string;
};

type ActionConfig = {
  status: FindingStatus;
  icon: string;
  labelKey: string;
  color: "neutral" | "success" | "warning" | "error";
  confirm?: ConfirmCopy;
};

const ALL_ACTIONS: ActionConfig[] = [
  {
    status: "resolved",
    icon: "i-tabler-circle-check",
    labelKey: "checks.actions.resolve",
    color: "success",
  },
  {
    status: "acknowledged",
    icon: "i-tabler-eye",
    labelKey: "checks.actions.acknowledge",
    color: "neutral",
  },
  {
    status: "waived",
    icon: "i-tabler-flag-off",
    labelKey: "checks.actions.waive",
    color: "error",
    confirm: {
      titleKey: "checks.actions.waiveTitle",
      bodyKey: "checks.actions.waiveBody",
      confirmKey: "checks.actions.waiveConfirm",
    },
  },
  {
    status: "open",
    icon: "i-tabler-reload",
    labelKey: "checks.actions.reopen",
    color: "warning",
    confirm: {
      titleKey: "checks.actions.reopenTitle",
      bodyKey: "checks.actions.reopenBody",
      confirmKey: "checks.actions.reopenConfirm",
    },
  },
];

const actions = computed(() => ALL_ACTIONS.filter((action) => action.status !== props.status));

type PendingConfirm = {
  status: FindingStatus;
  color: ActionConfig["color"];
  confirm: ConfirmCopy;
};

const pending = ref<PendingConfirm | null>(null);

function request(action: ActionConfig) {
  if (action.confirm) {
    pending.value = { status: action.status, color: action.color, confirm: action.confirm };
    return;
  }
  emit("change", action.status);
}

function confirm() {
  if (!pending.value) {
    return;
  }
  const target = pending.value.status;
  pending.value = null;
  emit("change", target);
}

function cancel() {
  pending.value = null;
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="action in actions"
        :key="action.status"
        :icon="action.icon"
        :color="action.color"
        variant="soft"
        :disabled="busy"
        @click="request(action)"
      >
        {{ t(action.labelKey) }}
      </UButton>
    </div>

    <div
      v-if="pending"
      class="flex flex-col gap-3 rounded-lg border border-default bg-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0 space-y-0.5">
        <p class="text-base font-medium text-highlighted">{{ t(pending.confirm.titleKey) }}</p>
        <p class="text-sm text-muted">{{ t(pending.confirm.bodyKey) }}</p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <UButton color="neutral" variant="ghost" :disabled="busy" @click="cancel">
          {{ t("checks.actions.cancel") }}
        </UButton>
        <UButton :color="pending.color" :loading="busy" @click="confirm">
          {{ t(pending.confirm.confirmKey) }}
        </UButton>
      </div>
    </div>
  </div>
</template>

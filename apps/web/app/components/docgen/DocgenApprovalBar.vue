<script setup lang="ts">
const props = defineProps<{
  busy?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{ approve: []; reject: [reason: string | undefined] }>();

const { t } = useI18n();
const reason = ref("");

function onApprove(): void {
  emit("approve");
}

function onReject(): void {
  emit("reject", reason.value.trim() || undefined);
  reason.value = "";
}
</script>

<template>
  <UCard>
    <div class="space-y-3">
      <div>
        <h2 class="text-sm font-semibold text-highlighted">{{ t("docgen.approval.title") }}</h2>
        <p class="text-xs text-muted">{{ t("docgen.approval.disclaimer") }}</p>
      </div>

      <UInput
        v-model="reason"
        class="w-full"
        size="sm"
        :placeholder="t('docgen.approval.reasonPlaceholder')"
      />

      <div class="flex flex-wrap items-center justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-tabler-x"
          :disabled="props.disabled || props.busy"
          :label="t('docgen.approval.reject')"
          @click="onReject"
        />
        <UButton
          color="primary"
          icon="i-tabler-check"
          :loading="props.busy"
          :disabled="props.disabled"
          :label="t('docgen.approval.approve')"
          @click="onApprove"
        />
      </div>
    </div>
  </UCard>
</template>

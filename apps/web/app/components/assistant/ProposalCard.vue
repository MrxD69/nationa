<script setup lang="ts">
const props = defineProps<{
  proposalId: string;
  status?: string | null;
  fields?: Array<{ fieldKey: string; label?: string | null; valueText?: string | null }>;
  rationale?: string | null;
  pending?: boolean;
  canResolve?: boolean;
}>();

const emit = defineEmits<{ accept: [id: string]; reject: [id: string] }>();

const { t } = useI18n();

const statusLabel = computed(() => {
  if (!props.status) {
    return t("assistant.proposal.draft");
  }
  const key = `assistant.proposal.${props.status}`;
  const translated = t(key);
  return translated === key ? props.status : translated;
});

const statusColor = computed(() => {
  switch (props.status) {
    case "accepted":
      return "success" as const;
    case "rejected":
      return "error" as const;
    case "superseded":
      return "neutral" as const;
    default:
      return "primary" as const;
  }
});

const resolvable = computed(() => !props.status || props.status === "draft");

function valueLabel(field: { fieldKey: string; label?: string | null; valueText?: string | null }) {
  return field.valueText ?? field.label ?? field.fieldKey;
}
</script>

<template>
  <div class="rounded-lg border border-primary/40 bg-primary/5 p-3">
    <div class="flex items-center gap-2">
      <UIcon name="i-tabler-sparkles" class="size-4 text-primary" />
      <p class="flex-1 text-base font-medium text-highlighted">
        {{ t("assistant.proposal.title") }}
      </p>
      <UBadge :color="statusColor" variant="subtle" size="lg" :label="statusLabel" />
    </div>

    <p v-if="rationale" class="mt-2 text-sm text-muted">{{ rationale }}</p>

    <dl v-if="fields?.length" class="mt-2 space-y-1">
      <div v-for="field in fields" :key="field.fieldKey" class="flex items-start gap-2 text-sm">
        <dt class="min-w-24 text-muted">{{ field.label || field.fieldKey }}</dt>
        <dd class="flex-1 text-toned">{{ valueLabel(field) }}</dd>
      </div>
    </dl>

    <div v-if="resolvable" class="mt-3 flex items-center gap-2">
      <UButton
        color="primary"
        icon="i-tabler-check"
        :disabled="!canResolve || pending"
        :loading="pending"
        :label="t('assistant.proposal.accept')"
        @click="emit('accept', proposalId)"
      />
      <UButton
        color="neutral"
        variant="soft"
        icon="i-tabler-x"
        :disabled="!canResolve || pending"
        :label="t('assistant.proposal.reject')"
        @click="emit('reject', proposalId)"
      />
    </div>
  </div>
</template>

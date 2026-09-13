<script setup lang="ts">
type BadgeColor = "neutral" | "warning" | "error";

type CriticalDocumentValue = {
  id: string;
  title: string;
  status: string;
  fileName?: string | null;
  mimeType?: string | null;
  createdAt?: string | Date | null;
};

const props = defineProps<{
  label: string;
  icon: string;
  document?: CriticalDocumentValue | null;
  loading?: boolean;
}>();

const emit = defineEmits<{ view: []; upload: [] }>();

const { t, locale } = useI18n();

const STATUS_META: Record<string, { key: string; color: BadgeColor }> = {
  uploaded: { key: "uploaded", color: "neutral" },
  processing: { key: "processing", color: "neutral" },
  extracted: { key: "extracted", color: "neutral" },
  verified: { key: "verified", color: "neutral" },
  needs_review: { key: "needs_review", color: "warning" },
  failed: { key: "failed", color: "error" },
};

const FALLBACK = { key: "uploaded", color: "neutral" as BadgeColor };

const statusMeta = computed(() => STATUS_META[props.document?.status ?? ""] ?? FALLBACK);

const displayName = computed(() => props.document?.fileName || props.document?.title || "");

const uploadedAt = computed(() => {
  const value = props.document?.createdAt;
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(date);
});
</script>

<template>
  <div
    class="flex h-full flex-col gap-4 rounded-lg border border-default p-4 shadow-card transition-control"
    :class="{ 'opacity-60': loading }"
    :aria-busy="loading"
  >
    <div class="flex min-w-0 items-start gap-3">
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
      >
        <UIcon :name="icon" class="size-5" />
      </div>

      <div class="min-w-0 flex-1 space-y-1">
        <p class="text-base font-semibold text-highlighted">{{ label }}</p>
        <p v-if="document" class="truncate text-sm text-muted" dir="auto" :title="displayName">
          {{ displayName }}
        </p>
        <p v-else class="text-sm text-muted">{{ t("documents.critical.missing") }}</p>
      </div>
    </div>

    <div v-if="document" class="flex flex-wrap items-center gap-2">
      <UBadge
        :color="statusMeta.color"
        variant="soft"
        size="sm"
        :label="t(`documents.status.${statusMeta.key}`)"
      />
      <span v-if="uploadedAt" class="text-xs text-muted tabular" dir="ltr">{{ uploadedAt }}</span>
    </div>

    <div class="mt-auto flex flex-wrap items-center gap-2">
      <template v-if="document">
        <UButton
          class="press"
          color="neutral"
          variant="soft"
          icon="i-tabler-eye"
          :label="t('documents.critical.view')"
          @click="emit('view')"
        />
        <UButton
          class="press"
          color="neutral"
          variant="ghost"
          icon="i-tabler-replace"
          :label="t('documents.critical.replace')"
          @click="emit('upload')"
        />
      </template>
      <UButton
        v-else
        class="press"
        color="primary"
        icon="i-tabler-upload"
        :label="t('documents.critical.upload')"
        @click="emit('upload')"
      />
    </div>
  </div>
</template>

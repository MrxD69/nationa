<script setup lang="ts">
import type { DocumentBundleItem } from "~/composables/useUpload";
import ExtractionStatus from "~/components/document/ExtractionStatus.vue";

const props = defineProps<{
  bundle: DocumentBundleItem;
  typeName?: string | null;
  selected?: boolean;
  reprocessing?: boolean;
}>();

const emit = defineEmits<{ select: [id: string]; reprocess: [id: string] }>();

const { t } = useI18n();

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) {
    return "—";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index] ?? "B"}`;
}

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString();
}

const document = computed(() => props.bundle.document);
const version = computed(() => props.bundle.version);
</script>

<template>
  <div
    class="flex flex-col gap-3 border-s-4 px-5 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between"
    :class="selected ? 'border-s-primary bg-primary/5' : 'border-s-transparent hover:bg-elevated'"
  >
    <div class="min-w-0 flex-1 space-y-2">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <p class="truncate text-lg font-semibold text-highlighted">
            {{ document.title || t("documents.list.untitled") }}
          </p>
          <p v-if="typeName" class="text-base text-muted">{{ typeName }}</p>
        </div>
        <ExtractionStatus :status="document.status" />
      </div>

      <dl class="flex flex-wrap items-center gap-x-6 gap-y-1 text-base text-muted">
        <div class="flex min-w-0 items-center gap-1.5">
          <dt>{{ t("documents.list.fileName") }}:</dt>
          <dd class="truncate text-toned">{{ version?.fileName ?? "—" }}</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt>{{ t("documents.list.size") }}:</dt>
          <dd class="text-toned">{{ formatSize(version?.size) }}</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt>{{ t("documents.list.uploadedAt") }}:</dt>
          <dd class="text-toned">{{ formatDate(document.createdAt) }}</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt>{{ t("documents.list.version") }}:</dt>
          <dd class="text-toned">v{{ version?.version ?? 1 }}</dd>
        </div>
      </dl>
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        icon="i-tabler-eye"
        :label="t('documents.list.view')"
        @click="emit('select', document.id)"
      />
      <UButton
        color="neutral"
        variant="soft"
        size="lg"
        icon="i-tabler-reload"
        :loading="reprocessing"
        :label="t('documents.extraction.reprocess')"
        @click="emit('reprocess', document.id)"
      />
    </div>
  </div>
</template>

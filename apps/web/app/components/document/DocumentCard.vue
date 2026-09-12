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
  <UCard
    :class="selected ? 'ring-2 ring-primary' : 'ring-1 ring-default'"
    :ui="{ body: 'p-4 sm:p-4' }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <p class="truncate text-sm font-semibold text-highlighted">
          {{ document.title || t("documents.list.untitled") }}
        </p>
        <p v-if="typeName" class="text-xs text-muted">{{ typeName }}</p>
      </div>
      <ExtractionStatus :status="document.status" />
    </div>

    <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      <div class="min-w-0">
        <dt class="text-muted">{{ t("documents.list.fileName") }}</dt>
        <dd class="truncate text-toned">{{ version?.fileName ?? "—" }}</dd>
      </div>
      <div>
        <dt class="text-muted">{{ t("documents.list.size") }}</dt>
        <dd class="text-toned">{{ formatSize(version?.size) }}</dd>
      </div>
      <div>
        <dt class="text-muted">{{ t("documents.list.uploadedAt") }}</dt>
        <dd class="text-toned">{{ formatDate(document.createdAt) }}</dd>
      </div>
      <div>
        <dt class="text-muted">{{ t("documents.list.version") }}</dt>
        <dd class="text-toned">v{{ version?.version ?? 1 }}</dd>
      </div>
    </dl>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-tabler-eye"
          :label="t('documents.list.view')"
          @click="emit('select', document.id)"
        />
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-tabler-reload"
          :loading="reprocessing"
          :label="t('documents.extraction.reprocess')"
          @click="emit('reprocess', document.id)"
        />
      </div>
    </template>
  </UCard>
</template>

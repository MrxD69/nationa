<script setup lang="ts">
import type { DocumentTypeItem, UploadResult } from "~/composables/useUpload";
import { CRITICAL_DOCUMENTS } from "~/constants/documents";

const props = defineProps<{
  companyId: string;
  types: DocumentTypeItem[];
}>();

const model = defineModel<string | null>({ default: null });

const emit = defineEmits<{ uploaded: [result: UploadResult] }>();

const { t } = useI18n();

const file = ref<File | null>(null);
const { upload, status, progress, error, isUploading, reset } = useUpload();

const entries = computed(() =>
  CRITICAL_DOCUMENTS.map((entry) => ({
    code: entry.code,
    icon: entry.icon,
    label: t(entry.labelKey),
    type: props.types.find((type) => type.code === entry.code) ?? null,
  })),
);

const selectedEntry = computed(
  () => entries.value.find((entry) => entry.type?.id === model.value) ?? null,
);

const accept = computed(
  () =>
    selectedEntry.value?.type?.acceptedMimeTypes?.join(",") ||
    "application/pdf,image/jpeg,image/png",
);

const errorMessage = computed(() => {
  if (!error.value) {
    return null;
  }
  return error.value === "missing-scope"
    ? t("documents.errors.missingScope")
    : t("documents.critical.error");
});

watch(file, () => {
  if (status.value !== "idle") {
    reset();
  }
});

function selectType(id: string) {
  model.value = id;
  if (status.value !== "idle") {
    reset();
  }
}

async function startUpload() {
  if (!file.value || !model.value) {
    return;
  }
  const result = await upload(file.value, {
    companyId: props.companyId,
    documentTypeId: model.value,
  });
  if (result) {
    file.value = null;
    reset();
    emit("uploaded", result);
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-2">
      <p class="text-sm font-medium text-toned">{{ t("documents.critical.categoryLabel") }}</p>

      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="entry in entries"
          :key="entry.code"
          type="button"
          class="press transition-control flex min-h-11 items-start gap-3 rounded-lg border p-3 text-start"
          :class="
            model && model === entry.type?.id
              ? 'border-primary bg-primary/5 ring-2 ring-primary'
              : 'border-default hover-surface'
          "
          :aria-pressed="model === entry.type?.id"
          :disabled="isUploading || !entry.type"
          @click="entry.type && selectType(entry.type.id)"
        >
          <UIcon :name="entry.icon" class="mt-0.5 size-5 shrink-0 text-primary" />
          <span class="min-w-0">
            <span class="block text-base font-medium text-highlighted">{{ entry.label }}</span>
            <span v-if="!entry.type" class="block text-sm text-muted">
              {{ t("documents.critical.missingType") }}
            </span>
          </span>
        </button>
      </div>
    </div>

    <UFileUpload
      v-model="file"
      :accept="accept"
      :disabled="isUploading || !selectedEntry"
      icon="i-tabler-upload"
      :label="t('documents.critical.chooseFile')"
      :description="selectedEntry?.type?.description ?? undefined"
    />

    <div v-if="isUploading" class="space-y-2">
      <UProgress :model-value="progress" :max="100" color="primary" />
      <p class="text-sm text-muted">
        {{
          status === "uploading"
            ? t("documents.upload.uploading")
            : t("documents.upload.processing")
        }}
      </p>
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-tabler-alert-triangle"
      :title="errorMessage"
    />

    <UButton
      block
      class="press"
      color="primary"
      icon="i-tabler-upload"
      :loading="isUploading"
      :disabled="!file || !model || isUploading"
      :label="t('documents.critical.submit')"
      @click="startUpload"
    />
  </div>
</template>

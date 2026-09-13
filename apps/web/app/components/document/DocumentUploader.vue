<script setup lang="ts">
import { FIELD_LABELS, type CanonicalFieldKey } from "@nationa/api/domain/fields";
import type { DocumentTypeItem, UploadResult, UploadScope } from "~/composables/useUpload";
import DocumentTypeSelect from "~/components/document/DocumentTypeSelect.vue";

const props = defineProps<{ companyId?: string; caseId?: string }>();

const emit = defineEmits<{ uploaded: [result: UploadResult] }>();

const { t, locale } = useI18n();

const file = ref<File | null>(null);
const typeId = ref<string | undefined>(undefined);
const selectedType = ref<DocumentTypeItem | null>(null);

const { upload, status, progress, error, isUploading, reset } = useUpload();

const accept = computed(
  () => selectedType.value?.acceptedMimeTypes?.join(",") || "application/pdf,image/jpeg,image/png",
);

const requiredFields = computed(() => selectedType.value?.requiredFields ?? []);

const errorMessage = computed(() => {
  if (!error.value) {
    return null;
  }
  return error.value === "missing-scope"
    ? t("documents.errors.missingScope")
    : t("documents.errors.uploadFailed");
});

function fieldLabel(key: string): string {
  const label = FIELD_LABELS[key as CanonicalFieldKey];
  if (!label) {
    return key;
  }
  return (locale.value === "ar" ? label.ar : label.fr) || label.fr;
}

watch(file, () => {
  if (status.value !== "idle") {
    reset();
  }
});

async function startUpload() {
  if (!file.value) {
    return;
  }
  const scope: UploadScope = {
    companyId: props.companyId,
    caseId: props.caseId,
    documentTypeId: typeId.value,
  };
  const result = await upload(file.value, scope);
  if (result) {
    emit("uploaded", result);
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-tabler-cloud-upload" class="size-5 text-primary" />
        <div>
          <h2 class="text-base font-semibold text-highlighted">
            {{ t("documents.upload.title") }}
          </h2>
          <p class="text-sm text-muted">{{ t("documents.upload.subtitle") }}</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <DocumentTypeSelect
        v-model="typeId"
        :disabled="isUploading"
        @change="selectedType = $event"
      />

      <div v-if="requiredFields.length > 0" class="flex flex-wrap items-center gap-1.5">
        <span class="text-sm text-muted">{{ t("documents.upload.requiredHint") }}</span>
        <UBadge
          v-for="field in requiredFields"
          :key="field"
          color="neutral"
          variant="subtle"
          size="lg"
          :label="fieldLabel(field)"
        />
      </div>

      <UFileUpload
        v-model="file"
        :accept="accept"
        :disabled="isUploading"
        icon="i-tabler-upload"
        :label="t('documents.upload.label')"
        :description="t('documents.upload.description')"
      />

      <template v-if="isUploading">
        <UProgress :model-value="progress" :max="100" color="primary" />
        <p class="text-sm text-muted">
          {{
            status === "uploading"
              ? t("documents.upload.uploading")
              : t("documents.upload.processing")
          }}
        </p>
      </template>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-tabler-alert-triangle"
        :title="errorMessage"
      />

      <UAlert
        v-else-if="status === 'done'"
        color="success"
        variant="soft"
        icon="i-tabler-circle-check"
        :title="t('documents.upload.success')"
      />

      <UButton
        block
        color="primary"
        icon="i-tabler-upload"
        :loading="isUploading"
        :disabled="!file || isUploading"
        :label="t('documents.upload.button')"
        @click="startUpload"
      />
    </div>
  </UCard>
</template>

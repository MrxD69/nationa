<script setup lang="ts">
type DocumentType = {
  id: string;
  code: string;
  nameFr: string;
  nameAr?: string | null;
  description?: string | null;
  acceptedMimeTypes: string[];
};

type UploadStep = {
  id: string;
  requiredDocumentType?: DocumentType | null;
};

type CaseDocument = {
  id: string;
  title: string;
  status: string;
  documentTypeId?: string | null;
};

const props = defineProps<{
  step: UploadStep;
  caseId: string;
  companyId?: string;
  documents?: CaseDocument[];
}>();

const emit = defineEmits<{ (event: "refresh"): void }>();

const { locale, t } = useI18n();
const api = useCase();

const file = ref<File | null>(null);
const uploading = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

const documentTypeName = computed(() => {
  const type = props.step.requiredDocumentType;
  if (!type) {
    return null;
  }
  return locale.value === "ar" ? (type.nameAr ?? type.nameFr) : type.nameFr;
});

const accepted = computed(
  () => props.step.requiredDocumentType?.acceptedMimeTypes?.join(",") ?? "*",
);

const existingDocuments = computed(() =>
  (props.documents ?? []).filter(
    (document) =>
      !props.step.requiredDocumentType ||
      document.documentTypeId === props.step.requiredDocumentType.id,
  ),
);

const statusColor: Record<
  string,
  "primary" | "info" | "success" | "warning" | "error" | "neutral"
> = {
  uploaded: "neutral",
  processing: "info",
  extracted: "success",
  needs_review: "warning",
  verified: "success",
  failed: "error",
};

async function upload(): Promise<void> {
  if (!file.value) {
    return;
  }
  uploading.value = true;
  error.value = null;
  success.value = false;
  try {
    await api.uploadCaseDocument({
      caseId: props.caseId,
      companyId: props.companyId,
      documentTypeId: props.step.requiredDocumentType?.id,
      file: file.value,
    });
    file.value = null;
    success.value = true;
    emit("refresh");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="grid gap-4">
    <UAlert
      v-if="documentTypeName"
      color="neutral"
      variant="subtle"
      icon="i-tabler-file-check"
      :title="documentTypeName"
      :description="props.step.requiredDocumentType?.description ?? undefined"
    />

    <UFileUpload
      v-model="file"
      :accept="accepted"
      :label="t('cases.upload.label')"
      :description="t('cases.upload.hint')"
      :multiple="false"
      class="w-full"
    />

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />
    <UAlert v-if="success" color="success" variant="subtle" :title="t('cases.upload.success')" />

    <div class="flex justify-end">
      <UButton
        :loading="uploading"
        :disabled="!file || uploading"
        icon="i-tabler-upload"
        :label="t('common.actions.upload')"
        @click="upload"
      />
    </div>

    <div v-if="existingDocuments.length" class="grid gap-2">
      <h3 class="text-base font-medium text-highlighted">{{ t("cases.upload.uploaded") }}</h3>
      <div
        v-for="document in existingDocuments"
        :key="document.id"
        class="flex items-center justify-between gap-2 rounded-lg border border-default px-3 py-2"
      >
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-tabler-file" class="size-4 shrink-0 text-muted" />
          <span class="truncate text-base">{{ document.title }}</span>
        </div>
        <UBadge :color="statusColor[document.status] ?? 'neutral'" variant="subtle" size="lg">
          {{ t(`cases.upload.status.${document.status}`, document.status) }}
        </UBadge>
      </div>
    </div>
  </div>
</template>

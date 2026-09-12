<script setup lang="ts">
import type { UploadResult } from "~/composables/useUpload";

const props = defineProps<{ companyId: string; disabled?: boolean }>();

const emit = defineEmits<{ extracted: [invoiceId: string] }>();

const { t } = useI18n();
const client = useApi();
const { upload, status, progress, error, isUploading, reset } = useUpload();

const file = ref<File | null>(null);
const invoiceTypeId = ref<string | undefined>(undefined);
const extracting = ref(false);

onMounted(async () => {
  try {
    const types = (await client.documents.listTypes()) as unknown as Array<{
      id: string;
      code: string;
    }>;
    invoiceTypeId.value = types.find((type) => type.code === "facture")?.id;
  } catch {
    invoiceTypeId.value = undefined;
  }
});

const busy = computed(() => isUploading.value || extracting.value);
const errorMessage = computed(() => (error.value ? t("invoices.upload.failed") : null));

watch(file, () => {
  if (status.value !== "idle") {
    reset();
  }
});

async function start() {
  if (!file.value) {
    return;
  }
  const result: UploadResult | null = await upload(file.value, {
    companyId: props.companyId,
    documentTypeId: invoiceTypeId.value,
  });
  if (!result) {
    return;
  }
  extracting.value = true;
  try {
    const extracted = (await client.invoices.extractFromDocument({
      companyId: props.companyId,
      documentId: result.documentId,
    })) as unknown as { invoice: { id: string } };
    file.value = null;
    reset();
    emit("extracted", extracted.invoice.id);
  } catch {
    error.value = "extraction-failed";
  } finally {
    extracting.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-tabler-cloud-upload" class="size-5 text-primary" />
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ t("invoices.upload.title") }}
          </h2>
          <p class="text-xs text-muted">{{ t("invoices.upload.subtitle") }}</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <UFileUpload
        v-model="file"
        accept="application/pdf,image/jpeg,image/png"
        :disabled="busy || disabled"
        icon="i-tabler-receipt"
        :label="t('invoices.upload.subtitle')"
        :description="t('invoices.upload.subtitle')"
      />

      <template v-if="busy">
        <UProgress :model-value="progress" :max="100" color="primary" />
        <p class="text-xs text-muted">
          {{ extracting ? t("invoices.upload.processing") : t("invoices.upload.uploading") }}
        </p>
      </template>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-tabler-alert-triangle"
        :title="errorMessage"
      />

      <UButton
        block
        color="primary"
        icon="i-tabler-upload"
        :loading="busy"
        :disabled="!file || busy || disabled"
        :label="t('invoices.upload.button')"
        @click="start"
      />
    </div>
  </UCard>
</template>

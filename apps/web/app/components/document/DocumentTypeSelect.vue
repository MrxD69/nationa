<script setup lang="ts">
import type { DocumentTypeItem } from "~/composables/useUpload";

const model = defineModel<string | undefined>();

defineProps<{ disabled?: boolean }>();

const emit = defineEmits<{ change: [value: DocumentTypeItem | null] }>();

const client = useApi();
const { t, locale } = useI18n();

const types = ref<DocumentTypeItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const items = computed(() =>
  types.value.map((type) => ({
    label: (locale.value === "ar" ? type.nameAr : type.nameFr) || type.nameFr,
    value: type.id,
    description: type.description ?? undefined,
  })),
);

function emitChange() {
  const found = types.value.find((type) => type.id === model.value) ?? null;
  emit("change", found);
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    types.value = (await client.documents.listTypes()) as DocumentTypeItem[];
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    loading.value = false;
    emitChange();
  }
}

watch(model, emitChange);
onMounted(load);
</script>

<template>
  <div class="space-y-1.5">
    <label class="text-sm font-medium text-toned">{{ t("documents.upload.typeLabel") }}</label>
    <USelect
      v-model="model"
      :items="items"
      :disabled="disabled || loading"
      :placeholder="t('documents.upload.typePlaceholder')"
      icon="i-tabler-file-description"
      class="w-full"
    />
    <p v-if="error" class="text-sm text-error">{{ t("documents.errors.generic") }}</p>
  </div>
</template>

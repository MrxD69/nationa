<script setup lang="ts">
import type { DocgenMode } from "~/composables/useDocgen";
import type { DocLang } from "@nationa/api/documents/templates/types";
import DocgenTemplatePicker from "~/components/docgen/DocgenTemplatePicker.vue";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const { templatesQuery, generateMutation, defaultLanguage } = useDocgen();

const caseId = computed(() =>
  typeof route.query.caseId === "string" ? route.query.caseId : undefined,
);
const companyId = computed(() =>
  typeof route.query.companyId === "string" ? route.query.companyId : undefined,
);
const stepId = computed(() =>
  typeof route.query.stepId === "string" ? route.query.stepId : undefined,
);

const { data: templates, pending } = templatesQuery();

const picker = ref<{ templateCode: string | null; language: DocLang; mode: DocgenMode }>({
  templateCode: null,
  language: defaultLanguage.value,
  mode: "template",
});

const canGenerate = computed(
  () => Boolean(picker.value.templateCode) && Boolean(caseId.value || companyId.value),
);

const generate = generateMutation({
  onSuccess: (draft) => {
    void router.push(`/docgen/${draft.proposal.id}`);
  },
});

async function onGenerate(): Promise<void> {
  if (!picker.value.templateCode || !canGenerate.value) {
    return;
  }
  try {
    await generate.mutateAsync({
      templateCode: picker.value.templateCode,
      language: picker.value.language,
      mode: picker.value.mode,
      ...(caseId.value ? { caseId: caseId.value } : {}),
      ...(companyId.value ? { companyId: companyId.value } : {}),
      ...(stepId.value ? { stepId: stepId.value } : {}),
    });
  } catch (error) {
    toast.add({
      title: t("docgen.errors.generateFailed"),
      description: error instanceof Error ? error.message : undefined,
      color: "error",
    });
  }
}
</script>

<template>
  <UContainer class="max-w-4xl space-y-6 py-8">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold tracking-tight text-highlighted">{{ t("docgen.title") }}</h1>
      <p class="text-sm text-muted">{{ t("docgen.subtitle") }}</p>
    </div>

    <UAlert
      v-if="!caseId && !companyId"
      color="warning"
      variant="soft"
      icon="i-tabler-alert-triangle"
      :title="t('docgen.scope.missingTitle')"
      :description="t('docgen.scope.missingDescription')"
    />

    <DocgenTemplatePicker v-model="picker" :templates="templates ?? []" :loading="pending" />

    <div class="flex items-center justify-end">
      <UButton
        color="primary"
        icon="i-tabler-sparkles"
        :loading="generate.isPending.value"
        :disabled="!canGenerate"
        :label="t('docgen.picker.generate')"
        @click="onGenerate"
      />
    </div>
  </UContainer>
</template>

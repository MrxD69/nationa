<script setup lang="ts">
import type { DocgenMode } from "~/composables/useDocgen";
import type { DocLang } from "@nationa/api/documents/templates/types";
import DocgenTemplatePicker from "~/components/docgen/DocgenTemplatePicker.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import EmptyState from "~/components/ui/EmptyState.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const { templatesQuery, generateMutation, defaultLanguage } = useDocgen();
const { accessibleCompanyId } = useSelectedCompany();

const caseId = computed(() =>
  typeof route.query.caseId === "string" ? route.query.caseId : undefined,
);
const companyId = computed(() => accessibleCompanyId.value ?? undefined);
const stepId = computed(() =>
  typeof route.query.stepId === "string" ? route.query.stepId : undefined,
);

const { data: templates, isPending } = templatesQuery();

const picker = ref<{ templateCode: string | null; language: DocLang; mode: DocgenMode }>({
  templateCode: null,
  language: defaultLanguage.value,
  mode: "template",
});

const hasScope = computed(() => Boolean(caseId.value || companyId.value));
const canGenerate = computed(() => Boolean(picker.value.templateCode) && hasScope.value);

const generate = generateMutation({
  onSuccess: (draft) => {
    void router.push(`/docgen/${draft.proposal.id}`);
  },
});

async function onGenerate(): Promise<void> {
  if (!picker.value.templateCode) {
    toast.add({ title: t("docgen.errors.missingTemplate"), color: "warning" });
    return;
  }
  if (!canGenerate.value) {
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
  <div class="mx-auto w-full max-w-5xl space-y-6">
    <PageHeader
      :title="t('docgen.title')"
      :subtitle="t('docgen.subtitle')"
      icon="i-tabler-file-text"
    />

    <UAlert
      v-if="!caseId && !companyId"
      color="warning"
      variant="soft"
      icon="i-tabler-alert-triangle"
      :title="t('docgen.scope.missingTitle')"
      :description="t('docgen.scope.missingDescription')"
    />

    <LoadingState v-if="isPending" variant="skeleton-grid" />

    <EmptyState
      v-else-if="(templates ?? []).length === 0"
      icon="i-tabler-file-off"
      :title="t('docgen.picker.empty')"
    />

    <template v-else>
      <DocgenTemplatePicker v-model="picker" :templates="templates ?? []" :loading="isPending" />

      <div class="flex items-center justify-end">
        <UButton
          color="primary"
          icon="i-tabler-sparkles"
          :loading="generate.isPending.value"
          :disabled="!hasScope"
          :label="t('docgen.picker.generate')"
          @click="onGenerate"
        />
      </div>
    </template>
  </div>
</template>

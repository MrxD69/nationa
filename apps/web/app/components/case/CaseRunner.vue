<script setup lang="ts">
import CaseStepDocgenPreview from "~/components/case/CaseStepDocgenPreview.vue";
import CaseStepForm from "~/components/case/CaseStepForm.vue";
import CaseStepInfo from "~/components/case/CaseStepInfo.vue";
import CaseStepNav from "~/components/case/CaseStepNav.vue";
import CaseStepPayment from "~/components/case/CaseStepPayment.vue";
import CaseStepReview from "~/components/case/CaseStepReview.vue";
import CaseStepSubmission from "~/components/case/CaseStepSubmission.vue";
import CaseStepUpload from "~/components/case/CaseStepUpload.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import StickyActionBar from "~/components/ui/StickyActionBar.vue";

type RunnerField = {
  id: string;
  fieldKey: string;
  valueText?: string | null;
  valueJsonb?: unknown;
  sourceKind?: string;
  provenance?: Array<Record<string, unknown>>;
};

const props = defineProps<{ caseId: string }>();

const { locale, t } = useI18n();
const api = useCase();
const { templatesQuery, defaultLanguage } = useDocgen();

const { data: docgenTemplates } = templatesQuery();

const { data, isLoading, refetch } = api.caseQuery(props.caseId);
const payment = api.paymentQuery(props.caseId);
const saveFields = api.saveFieldsMutation(props.caseId);
const completeStep = api.completeStepMutation(props.caseId);
const skipStepMutation = api.skipStepMutation(props.caseId);
const submitCase = api.submitMutation(props.caseId);
const cancelCase = api.cancelMutation(props.caseId);

const detail = computed(() => data.value ?? null);
const steps = computed(() => detail.value?.steps ?? []);
const fields = computed<RunnerField[]>(() => (detail.value?.fields ?? []) as RunnerField[]);

const currentIndex = ref(0);
const formValues = ref<Record<string, unknown>>({});

const currentStep = computed(() => steps.value[currentIndex.value]);
const currentStepFields = computed(() => currentStep.value?.formSchema?.fields ?? []);
const canSkip = computed(() => Boolean(currentStep.value?.template?.isOptional));
const infoStep = computed(() =>
  currentStep.value?.template
    ? { ...currentStep.value.template, citations: currentStep.value.citations }
    : null,
);

const docgenTemplateCode = computed(() => {
  const documentTypeCode = currentStep.value?.requiredDocumentType?.code;
  if (!documentTypeCode) {
    return null;
  }
  return (
    (docgenTemplates.value ?? []).find((template) => template.documentTypeCode === documentTypeCode)
      ?.code ?? null
  );
});

const showDocgenPreview = computed(() => {
  const stepType = currentStep.value?.template?.stepType;
  return (
    (stepType === "upload" || stepType === "form") && docgenTemplateCode.value === "statuts_sarl"
  );
});

const provenanceByKey = computed(() => {
  const map: Record<string, Array<Record<string, unknown>>> = {};
  for (const field of fields.value) {
    map[field.fieldKey] = field.provenance ?? [];
  }
  return map;
});

const submissionReady = computed(() => {
  const required = steps.value.filter(
    (step: { template?: { stepType?: string; isOptional?: boolean } | null; status: string }) =>
      step.template?.stepType !== "submission" && !step.template?.isOptional,
  );
  return required.every((step) => step.status === "completed");
});

const caseTitle = computed(() => detail.value?.case.title ?? "");

const procedureName = computed(() => {
  const template = detail.value?.template;
  if (!template) {
    return "";
  }
  if (locale.value === "ar") {
    return template.nameAr ?? template.nameFr ?? "";
  }
  return template.nameFr ?? "";
});

const agencyName = computed(() => {
  const template = detail.value?.template;
  if (!template) {
    return "";
  }
  if (locale.value === "ar") {
    return template.agencyNameAr ?? template.agencyNameFr ?? "";
  }
  return template.agencyNameFr ?? "";
});

const runnerSubtitle = computed(() =>
  [procedureName.value, agencyName.value].filter(Boolean).join(" · "),
);

const isLastStep = computed(
  () => steps.value.length > 0 && currentIndex.value === steps.value.length - 1,
);

const canCancel = computed(() => {
  const status = detail.value?.case.status;
  return status !== "cancelled" && status !== "submitted";
});

const statusColor: Record<
  string,
  "primary" | "info" | "success" | "warning" | "error" | "neutral"
> = {
  draft: "neutral",
  in_progress: "info",
  awaiting_user: "warning",
  awaiting_review: "warning",
  submitted: "success",
  approved: "success",
  rejected: "error",
  cancelled: "neutral",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function initializeFormValues(rows: RunnerField[]): void {
  const next: Record<string, unknown> = {};
  for (const field of rows) {
    next[field.fieldKey] = field.valueJsonb ?? field.valueText ?? null;
  }
  formValues.value = next;
}

watch(
  detail,
  (value) => {
    if (!value) {
      return;
    }
    initializeFormValues(value.fields as RunnerField[]);
    const index = value.steps.findIndex(
      (step: { status: string }) => step.status !== "completed" && step.status !== "skipped",
    );
    currentIndex.value = index === -1 ? Math.max(0, value.steps.length - 1) : index;
  },
  { immediate: true },
);

function fieldEntries() {
  return currentStepFields.value.map((field: { key: string }) => {
    const value = formValues.value[field.key];
    if (isObject(value) || typeof value === "boolean") {
      return { key: field.key, valueJsonb: value, valueText: null };
    }
    return {
      key: field.key,
      valueText: value === null || value === undefined ? null : String(value),
      valueJsonb: null,
    };
  });
}

const saving = ref(false);
const error = ref<string | null>(null);
const stepError = ref<string | null>(null);
const cancelOpen = ref(false);
const cancelling = ref(false);

function hasMissingRequired(): boolean {
  return currentStepFields.value.some(
    (field: { key: string; required?: boolean }) =>
      field.required &&
      (formValues.value[field.key] === null ||
        formValues.value[field.key] === undefined ||
        formValues.value[field.key] === ""),
  );
}

async function saveCurrent(): Promise<void> {
  if (currentStep.value?.template?.stepType !== "form" || currentStepFields.value.length === 0) {
    return;
  }
  await saveFields.mutateAsync({
    caseId: props.caseId,
    stepId: currentStep.value.id,
    fields: fieldEntries(),
  });
}

async function continueStep(): Promise<void> {
  if (!currentStep.value || isLastStep.value) {
    return;
  }
  stepError.value = null;
  if (currentStep.value.template?.stepType === "form" && hasMissingRequired()) {
    stepError.value = t("cases.runner.required");
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await saveCurrent();
    await completeStep.mutateAsync({
      caseId: props.caseId,
      stepId: currentStep.value.id,
    });
    if (currentIndex.value < steps.value.length - 1) {
      currentIndex.value += 1;
    }
    await refetch();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    saving.value = false;
  }
}

async function skipCurrent(): Promise<void> {
  if (!currentStep.value) {
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await skipStepMutation.mutateAsync({
      caseId: props.caseId,
      stepId: currentStep.value.id,
    });
    if (currentIndex.value < steps.value.length - 1) {
      currentIndex.value += 1;
    }
    await refetch();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    saving.value = false;
  }
}

async function submit(): Promise<void> {
  saving.value = true;
  error.value = null;
  try {
    if (currentStep.value && currentStep.value.status !== "completed") {
      await completeStep.mutateAsync({
        caseId: props.caseId,
        stepId: currentStep.value.id,
      });
    }
    await submitCase.mutateAsync({ caseId: props.caseId });
    await refetch();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    saving.value = false;
  }
}

async function cancel(): Promise<void> {
  error.value = null;
  cancelling.value = true;
  try {
    await cancelCase.mutateAsync({ caseId: props.caseId });
    cancelOpen.value = false;
    await refetch();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    cancelling.value = false;
  }
}
</script>

<template>
  <LoadingState v-if="isLoading" variant="spinner" :label="t('cases.runner.loading')" />

  <div v-else-if="detail" class="grid gap-6">
    <PageHeader
      :title="caseTitle"
      :subtitle="runnerSubtitle"
      back-to="/cases"
      :back-label="t('cases.runner.back')"
      max-width="max-w-6xl"
    >
      <template #meta>
        <UBadge :color="statusColor[detail.case.status] ?? 'neutral'" variant="subtle" size="lg">
          {{ t(`cases.status.${detail.case.status}`, detail.case.status) }}
        </UBadge>
      </template>
      <template #actions>
        <UButton
          v-if="canCancel"
          color="neutral"
          variant="outline"
          icon="i-tabler-x"
          :label="t('cases.runner.cancel')"
          @click="cancelOpen = true"
        />
      </template>
    </PageHeader>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />

    <div class="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <aside class="lg:border-e lg:border-default lg:pe-6">
        <CaseStepNav v-model="currentIndex" :steps="steps" />
      </aside>

      <section v-if="currentStep" class="grid gap-6">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">
            {{
              currentStep.template?.titleFr ??
              t("cases.runner.step", { position: currentStep.position })
            }}
          </h2>
          <p v-if="currentStep.template?.description" class="text-base leading-6 text-muted">
            {{ currentStep.template.description }}
          </p>
        </div>

        <CaseStepInfo
          v-if="currentStep.template?.stepType === 'info' && infoStep"
          :step="infoStep"
        />

        <CaseStepForm
          v-else-if="currentStep.template?.stepType === 'form'"
          v-model="formValues"
          :step="currentStep"
          :provenance="provenanceByKey"
        />

        <CaseStepUpload
          v-else-if="currentStep.template?.stepType === 'upload'"
          :step="currentStep"
          :case-id="props.caseId"
          :company-id="detail.case.companyId ?? undefined"
          :documents="detail.documents"
          @refresh="refetch"
        />

        <CaseStepPayment
          v-else-if="currentStep.template?.stepType === 'payment'"
          :quote="payment.data.value"
          :loading="payment.isLoading.value"
        />

        <CaseStepReview
          v-else-if="currentStep.template?.stepType === 'review'"
          :case-id="props.caseId"
          :company-id="detail.case.companyId ?? undefined"
          :fields="fields"
        />

        <CaseStepSubmission
          v-else-if="currentStep.template?.stepType === 'submission'"
          :case-id="props.caseId"
          :steps="steps"
          :submitting="saving"
          :ready="submissionReady"
          @submit="submit"
        />

        <CaseStepDocgenPreview
          v-if="showDocgenPreview"
          :case-id="props.caseId"
          :step-id="currentStep.id"
          :template-code="docgenTemplateCode ?? ''"
          :language="defaultLanguage"
        />

        <UAlert
          v-if="stepError"
          color="warning"
          variant="subtle"
          icon="i-tabler-alert-triangle"
          :title="stepError"
        />

        <StickyActionBar>
          <template #secondary>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-tabler-arrow-left"
              :ui="{ leadingIcon: 'rtl:rotate-180' }"
              :disabled="currentIndex === 0"
              :label="t('common.actions.back')"
              @click="currentIndex -= 1"
            />
          </template>

          <UButton
            v-if="canSkip"
            color="neutral"
            variant="outline"
            icon="i-tabler-player-skip-forward"
            :label="t('cases.runner.skip')"
            :loading="saving"
            :disabled="saving"
            @click="skipCurrent"
          />
          <UButton
            v-if="!isLastStep && currentStep.template?.stepType !== 'submission'"
            icon="i-tabler-arrow-right"
            :ui="{ trailingIcon: 'rtl:rotate-180' }"
            :label="t('cases.runner.continue')"
            :loading="saving"
            :disabled="saving"
            @click="continueStep"
          />
        </StickyActionBar>
      </section>
    </div>
  </div>

  <UAlert
    v-else
    color="error"
    variant="subtle"
    icon="i-tabler-alert-triangle"
    :title="t('cases.runner.notFound')"
  />

  <UModal v-model:open="cancelOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-medium text-highlighted">{{ t("cases.runner.cancelTitle") }}</h2>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-tabler-x"
              square
              @click="cancelOpen = false"
            />
          </div>
        </template>

        <p class="text-base text-muted">{{ t("cases.runner.cancelBody") }}</p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :label="t('cases.runner.cancelKeep')"
              @click="cancelOpen = false"
            />
            <UButton
              color="error"
              icon="i-tabler-x"
              :loading="cancelling"
              :label="t('cases.runner.cancelConfirm')"
              @click="cancel"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

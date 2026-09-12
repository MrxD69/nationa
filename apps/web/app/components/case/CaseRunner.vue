<script setup lang="ts">
import CaseStepForm from "~/components/case/CaseStepForm.vue";
import CaseStepInfo from "~/components/case/CaseStepInfo.vue";
import CaseStepNav from "~/components/case/CaseStepNav.vue";
import CaseStepPayment from "~/components/case/CaseStepPayment.vue";
import CaseStepReview from "~/components/case/CaseStepReview.vue";
import CaseStepSubmission from "~/components/case/CaseStepSubmission.vue";
import CaseStepUpload from "~/components/case/CaseStepUpload.vue";

type RunnerField = {
  id: string;
  fieldKey: string;
  valueText?: string | null;
  valueJsonb?: unknown;
  sourceKind?: string;
  provenance?: Array<Record<string, unknown>>;
};

const props = defineProps<{ caseId: string }>();

const { t } = useI18n();
const api = useCase();

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
  if (!currentStep.value) {
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
  try {
    await cancelCase.mutateAsync({ caseId: props.caseId });
    await refetch();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <div v-if="isLoading" class="flex items-center gap-2 py-12 text-sm text-muted">
    <UIcon name="i-tabler-loader-2" class="animate-spin" />
    <span>{{ t("cases.runner.loading") }}</span>
  </div>

  <div v-else-if="detail" class="grid gap-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="truncate text-xl font-semibold text-highlighted">{{ detail.case.title }}</h1>
          <UBadge :color="statusColor[detail.case.status] ?? 'neutral'" variant="subtle">
            {{ t(`cases.status.${detail.case.status}`, detail.case.status) }}
          </UBadge>
        </div>
        <p class="text-sm text-muted">
          {{ detail.template.nameFr }}
          <span v-if="detail.template.agencyNameFr">· {{ detail.template.agencyNameFr }}</span>
        </p>
      </div>

      <UButton
        v-if="detail.case.status !== 'cancelled' && detail.case.status !== 'submitted'"
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-tabler-x"
        :label="t('cases.runner.cancel')"
        @click="cancel"
      />
    </div>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />

    <div class="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <aside class="lg:border-e lg:border-default lg:pe-6">
        <CaseStepNav v-model="currentIndex" :steps="steps" />
      </aside>

      <section v-if="currentStep" class="grid gap-6">
        <div class="space-y-1">
          <h2 class="text-lg font-medium text-highlighted">
            {{
              currentStep.template?.titleFr ??
              t("cases.runner.step", { position: currentStep.position })
            }}
          </h2>
          <p v-if="currentStep.template?.description" class="text-sm leading-6 text-muted">
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

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-default pt-4">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-tabler-arrow-left"
            :disabled="currentIndex === 0"
            :label="t('common.actions.back')"
            @click="currentIndex -= 1"
          />

          <div class="flex items-center gap-2">
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
              v-if="currentStep.template?.stepType !== 'submission'"
              icon="i-tabler-arrow-right"
              :label="t('cases.runner.continue')"
              :loading="saving"
              :disabled="saving"
              @click="continueStep"
            />
          </div>
        </div>
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
</template>

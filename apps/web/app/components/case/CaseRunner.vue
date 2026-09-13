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

type RunnerStep = NonNullable<typeof detail.value>["steps"][number];
type RunnerDocumentType = NonNullable<RunnerStep["requiredDocumentType"]>;

const uploadedDocumentTypeIds = computed(() => {
  const ids = new Set<string>();
  for (const document of detail.value?.documents ?? []) {
    if (document.documentTypeId) {
      ids.add(document.documentTypeId);
    }
  }
  return ids;
});

// Every distinct document type required by the procedure.
const requiredDocumentTypes = computed<RunnerDocumentType[]>(() => {
  const map = new Map<string, RunnerDocumentType>();
  for (const step of steps.value) {
    const type = step.requiredDocumentType;
    if (type && !map.has(type.id)) {
      map.set(type.id, type);
    }
  }
  return [...map.values()];
});

// On the submit step, surface anything still missing so it can be attached right there.
const missingRequiredDocumentTypes = computed<RunnerDocumentType[]>(() =>
  requiredDocumentTypes.value.filter(
    (type) =>
      !uploadedDocumentTypeIds.value.has(type.id) &&
      type.id !== currentStep.value?.requiredDocumentType?.id,
  ),
);

const showStepUpload = computed(
  () =>
    currentStep.value?.template?.stepType !== "upload" &&
    Boolean(currentStep.value?.requiredDocumentType),
);

const currentStepFields = computed(() => currentStep.value?.formSchema?.fields ?? []);
const canSkip = computed(() => Boolean(currentStep.value?.template?.isOptional));
const infoStep = computed(() =>
  currentStep.value?.template
    ? { ...currentStep.value.template, citations: currentStep.value.citations }
    : null,
);

const CHECKLIST_LIMIT = 8;
const checksExpanded = ref(false);

const descriptionChecks = computed<string[] | null>(() => {
  const raw = currentStep.value?.template?.description ?? "";
  if (!raw) {
    return null;
  }
  const parts = raw
    .split(/[·•]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : null;
});

const visibleChecks = computed(() =>
  !descriptionChecks.value
    ? []
    : checksExpanded.value
      ? descriptionChecks.value
      : descriptionChecks.value.slice(0, CHECKLIST_LIMIT),
);

watch(currentStep, () => {
  checksExpanded.value = false;
});

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

const stepIndexInitialized = ref(false);
const formKey = ref<string | null>(null);

// Jump to the first actionable step once; later refetches must not move the user.
watch(
  detail,
  (value) => {
    if (!value || stepIndexInitialized.value) {
      return;
    }
    stepIndexInitialized.value = true;
    const index = value.steps.findIndex(
      (step: { status: string }) => step.status !== "completed" && step.status !== "skipped",
    );
    currentIndex.value = index === -1 ? Math.max(0, value.steps.length - 1) : index;
  },
  { immediate: true },
);

// Load form values for the case/step being viewed, without clobbering edits on refetch.
watch(
  [detail, currentIndex],
  () => {
    const value = detail.value;
    if (!value) {
      return;
    }
    const key = `${value.case.id}:${currentIndex.value}`;
    if (formKey.value === key) {
      return;
    }
    formKey.value = key;
    initializeFormValues(value.fields as RunnerField[]);
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
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    cancelling.value = false;
  }
}
</script>

<template>
  <LoadingState v-if="isLoading" variant="spinner" :label="t('cases.runner.loading')" />

  <div v-else-if="detail" class="grid content-start gap-6">
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

    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <aside class="lg:border-e lg:border-default lg:pe-6">
        <CaseStepNav v-model="currentIndex" :steps="steps" />
      </aside>

      <section v-if="currentStep" class="grid content-start gap-6">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">
            {{
              currentStep.template?.titleFr ??
              t("cases.runner.step", { position: currentStep.position })
            }}
          </h2>
          <p
            v-if="currentStep.template?.description && !descriptionChecks"
            class="text-base leading-6 text-muted"
          >
            {{ currentStep.template.description }}
          </p>
          <div v-else-if="descriptionChecks" class="space-y-3">
            <p class="text-sm font-medium text-highlighted">
              {{ t("cases.runner.includedChecks", { count: descriptionChecks.length }) }}
            </p>
            <ul id="step-checks" class="grid grid-cols-1 gap-x-6 md:grid-cols-2">
              <li
                v-for="(check, index) in visibleChecks"
                :key="index"
                class="flex items-start gap-2.5 border-t border-default py-2.5 pe-2"
              >
                <UIcon
                  name="i-tabler-minus"
                  class="mt-1 size-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-1 break-words text-base leading-6 text-default">
                  {{ check }}
                </span>
              </li>
            </ul>
            <UButton
              v-if="descriptionChecks.length > CHECKLIST_LIMIT"
              color="neutral"
              variant="ghost"
              size="sm"
              class="min-h-11 transition-[color,background-color,border-color] duration-150"
              :icon="checksExpanded ? 'i-tabler-chevron-up' : 'i-tabler-chevron-down'"
              :label="
                checksExpanded
                  ? t('cases.runner.showFewer')
                  : t('cases.runner.showAll', {
                      count: descriptionChecks.length - CHECKLIST_LIMIT,
                    })
              "
              :aria-expanded="checksExpanded"
              aria-controls="step-checks"
              @click="checksExpanded = !checksExpanded"
            />
          </div>
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

        <!-- A step can require a document without being an "upload" step: attach it here. -->
        <CaseStepUpload
          v-if="showStepUpload && currentStep"
          :step="currentStep"
          :case-id="props.caseId"
          :company-id="detail.case.companyId ?? undefined"
          :documents="detail.documents"
          @refresh="refetch"
        />

        <div
          v-if="
            currentStep.template?.stepType === 'submission' && missingRequiredDocumentTypes.length
          "
          class="grid gap-4"
        >
          <h3 class="text-base font-medium text-highlighted">
            {{ t("cases.submission.attachTitle") }}
          </h3>
          <CaseStepUpload
            v-for="type in missingRequiredDocumentTypes"
            :key="type.id"
            :step="{ id: `${currentStep.id}:${type.id}`, requiredDocumentType: type }"
            :case-id="props.caseId"
            :company-id="detail.case.companyId ?? undefined"
            :documents="detail.documents"
            @refresh="refetch"
          />
        </div>

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

        <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-tabler-arrow-left"
            :ui="{ leadingIcon: 'rtl:rotate-180' }"
            :disabled="currentIndex === 0"
            :label="t('common.actions.back')"
            @click="currentIndex -= 1"
          />

          <div class="ms-auto flex flex-wrap items-center gap-2">
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

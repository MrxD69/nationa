<script setup lang="ts">
import DeficiencyForm from "~/components/officer/ops/DeficiencyForm.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

const props = defineProps<{ submissionId: string; agencyId: string }>();

const emit = defineEmits<{ decided: [] }>();

const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const api = useApi();

type Decision = "approve" | "reject" | "return_for_correction" | "escalate";

type DeficiencyTemplate = {
  id: string;
  decision: "return_for_correction" | "reject";
  labelFr: string;
  labelAr?: string | null;
  reasonFr: string;
  reasonAr?: string | null;
  checklist: Array<{
    code: string;
    labelFr: string;
    labelAr?: string | null;
    severity: "warning" | "error" | "blocker";
  }>;
};

// Start with no decision selected: an explicit choice, not a default that can be
// confirmed by muscle memory.
const decision = ref<Decision | null>(null);
const step = ref<"form" | "confirm">("form");
const reason = ref("");
const notes = ref("");
const submitting = ref(false);
const error = ref<string | null>(null);

const templates = ref<DeficiencyTemplate[]>([]);
const dueOptions = ref<number[]>([]);
const templatesLoading = ref(false);

// "Demander une correction" is a guided flow of its own, not a plain reason box.
const deficiencyMode = computed(() => decision.value === "return_for_correction");

const decisionItems = computed(() => [
  { label: t("officer.decision.approve"), value: "approve", icon: "i-tabler-circle-check" },
  { label: t("officer.decision.reject"), value: "reject", icon: "i-tabler-circle-x" },
  {
    label: t("officerOps.deficiency.entry"),
    value: "return_for_correction",
    icon: "i-tabler-file-alert",
  },
  { label: t("officer.decision.escalate"), value: "escalate", icon: "i-tabler-arrow-up-right" },
]);

const reasonRequired = computed(() => decision.value !== null && decision.value !== "approve");
const canSubmit = computed(
  () =>
    !submitting.value &&
    decision.value !== null &&
    (!reasonRequired.value || reason.value.trim().length >= 3),
);

const decisionLabel = computed(
  () => decisionItems.value.find((item) => item.value === decision.value)?.label ?? "",
);

// Reject/return are final: error styling. Escalate warns. Approve is primary.
const destructive = computed(
  () => decision.value === "reject" || decision.value === "return_for_correction",
);
const confirmColor = computed<"primary" | "error" | "warning">(() => {
  if (destructive.value) {
    return "error";
  }
  return decision.value === "escalate" ? "warning" : "primary";
});

function reset() {
  decision.value = null;
  step.value = "form";
  reason.value = "";
  notes.value = "";
  error.value = null;
}

async function loadTemplates() {
  if (templates.value.length > 0 || templatesLoading.value) {
    return;
  }
  templatesLoading.value = true;
  try {
    const result = await api.officer.deficiencyTemplates({ agencyId: props.agencyId });
    templates.value = result.templates ?? [];
    dueOptions.value = result.dueOptions ?? [];
  } catch {
    templates.value = [];
    dueOptions.value = [];
  } finally {
    templatesLoading.value = false;
  }
}

watch(open, (value) => {
  if (value) {
    reset();
    void loadTemplates();
  }
});

function onIssued() {
  open.value = false;
  emit("decided");
}

function goConfirm() {
  if (canSubmit.value) {
    step.value = "confirm";
  }
}

async function submit() {
  if (!canSubmit.value || decision.value === null) {
    return;
  }
  submitting.value = true;
  error.value = null;
  try {
    await api.officer.decide({
      agencyId: props.agencyId,
      submissionId: props.submissionId,
      decision: decision.value,
      reason: reason.value.trim() || t("officer.decision.approve"),
      notes: notes.value.trim() || undefined,
    });
    open.value = false;
    emit("decided");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    step.value = "form";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: deficiencyMode ? 'sm:max-w-2xl' : 'sm:max-w-lg' }">
    <template #content>
      <div class="flex max-h-[85vh] flex-col">
        <div class="flex items-center justify-between gap-3 border-b border-default px-4 py-3">
          <h2 class="text-base font-semibold text-highlighted">
            {{ t("officer.review.decision") }}
          </h2>
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            icon="i-tabler-x"
            square
            @click="open = false"
          />
        </div>

        <form
          class="grid gap-4 overflow-y-auto py-4"
          @submit.prevent="step === 'form' ? goConfirm() : submit()"
        >
          <div class="grid gap-4 px-4">
            <UAlert v-if="error" color="error" variant="subtle" :title="error" />

            <div class="space-y-1.5">
              <URadioGroup
                v-model="decision"
                :items="decisionItems"
                size="md"
                orientation="vertical"
              />
              <p v-if="!decision" class="text-sm text-muted">
                {{ t("officer.decision.choose") }}
              </p>
              <p v-else-if="deficiencyMode" class="text-sm text-muted">
                {{ t("officerOps.deficiency.entryHint") }}
              </p>
            </div>

            <template v-if="deficiencyMode">
              <LoadingState v-if="templatesLoading" :label="t('officerOps.common.loading')" />
              <DeficiencyForm
                v-else
                :agency-id="agencyId"
                :submission-id="submissionId"
                :templates="templates"
                :due-options="dueOptions"
                @issued="onIssued"
                @cancel="decision = null"
              />
            </template>

            <template v-else>
              <UFormField :label="t('officer.review.reason')" :required="reasonRequired">
                <UTextarea
                  v-model="reason"
                  :rows="3"
                  size="md"
                  class="w-full"
                  :placeholder="t('officer.review.reasonPlaceholder')"
                />
              </UFormField>

              <UFormField :label="t('officer.review.notes')">
                <UTextarea
                  v-model="notes"
                  :rows="2"
                  size="md"
                  class="w-full"
                  :placeholder="t('officer.review.notesPlaceholder')"
                />
              </UFormField>

              <div v-if="step === 'form'" class="flex justify-end gap-2">
                <UButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  size="md"
                  :label="t('officer.review.cancel')"
                  @click="open = false"
                />
                <UButton
                  type="submit"
                  size="xl"
                  :loading="submitting"
                  :disabled="!canSubmit"
                  :label="t('officer.review.submit')"
                />
              </div>
            </template>
          </div>

          <div
            v-if="!deficiencyMode && step === 'confirm'"
            class="space-y-3 border-t px-4 pt-4"
            :class="destructive ? 'border-error/40' : 'border-default'"
          >
            <p class="text-sm font-medium text-highlighted">
              {{ t("officer.review.confirmDecision", { decision: decisionLabel }) }}
            </p>
            <p v-if="destructive" class="flex items-center gap-1.5 text-sm text-error">
              <UIcon name="i-tabler-alert-triangle" class="size-4 shrink-0" />
              {{ t("officer.decision.rejectWarning") }}
            </p>
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="md"
                :label="t('officer.review.cancel')"
                @click="step = 'form'"
              />
              <UButton
                type="button"
                size="xl"
                :color="confirmColor"
                :loading="submitting"
                :label="decisionLabel"
                @click="submit"
              />
            </div>
          </div>
        </form>
      </div>
    </template>
  </UModal>
</template>

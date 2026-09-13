<script setup lang="ts">
const props = defineProps<{ submissionId: string; agencyId: string }>();

const emit = defineEmits<{ decided: [] }>();

const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const api = useApi();

type Decision = "approve" | "reject" | "return_for_correction" | "escalate";

// Start with no decision selected: an explicit choice, not a default that can be
// confirmed by muscle memory.
const decision = ref<Decision | null>(null);
const step = ref<"form" | "confirm">("form");
const reason = ref("");
const notes = ref("");
const submitting = ref(false);
const error = ref<string | null>(null);

const decisionItems = computed(() => [
  { label: t("officer.decision.approve"), value: "approve", icon: "i-tabler-circle-check" },
  { label: t("officer.decision.reject"), value: "reject", icon: "i-tabler-circle-x" },
  {
    label: t("officer.decision.return_for_correction"),
    value: "return_for_correction",
    icon: "i-tabler-arrow-back-up",
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

watch(open, (value) => {
  if (value) {
    reset();
  }
});

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
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ t("officer.review.decision") }}
            </h2>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-tabler-x"
              square
              @click="open = false"
            />
          </div>
        </template>

        <form class="grid gap-4" @submit.prevent="step === 'form' ? goConfirm() : submit()">
          <UAlert v-if="error" color="error" variant="subtle" :title="error" />

          <div class="space-y-1.5">
            <URadioGroup v-model="decision" :items="decisionItems" orientation="vertical" />
            <p v-if="!decision" class="text-sm text-muted">
              {{ t("officer.decision.choose") }}
            </p>
          </div>

          <UFormField :label="t('officer.review.reason')" :required="reasonRequired">
            <UTextarea
              v-model="reason"
              :rows="3"
              class="w-full"
              :placeholder="t('officer.review.reasonPlaceholder')"
            />
          </UFormField>

          <UFormField :label="t('officer.review.notes')">
            <UTextarea
              v-model="notes"
              :rows="2"
              class="w-full"
              :placeholder="t('officer.review.notesPlaceholder')"
            />
          </UFormField>

          <div v-if="step === 'form'" class="flex justify-end gap-2">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              :label="t('officer.review.cancel')"
              @click="open = false"
            />
            <UButton
              type="submit"
              :loading="submitting"
              :disabled="!canSubmit"
              :label="t('officer.review.submit')"
            />
          </div>

          <div
            v-else
            class="space-y-3 border-t pt-4"
            :class="destructive ? 'border-error/40' : 'border-default'"
          >
            <p class="text-base font-medium text-highlighted">
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
                :label="t('officer.review.cancel')"
                @click="step = 'form'"
              />
              <UButton
                type="button"
                :color="confirmColor"
                :loading="submitting"
                :label="decisionLabel"
                @click="submit"
              />
            </div>
          </div>
        </form>
      </UCard>
    </template>
  </UModal>
</template>

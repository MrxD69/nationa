<script setup lang="ts">
const props = defineProps<{ submissionId: string; agencyId: string }>();

const emit = defineEmits<{ decided: [] }>();

const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const api = useApi();

type Decision = "approve" | "reject" | "return_for_correction" | "escalate";

const decision = ref<Decision>("approve");
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

const reasonRequired = computed(() => decision.value !== "approve");
const canSubmit = computed(
  () => !submitting.value && (!reasonRequired.value || reason.value.trim().length >= 3),
);

function reset() {
  decision.value = "approve";
  reason.value = "";
  notes.value = "";
  error.value = null;
}

watch(open, (value) => {
  if (value) {
    reset();
  }
});

async function submit() {
  if (!canSubmit.value) {
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
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-medium text-highlighted">{{ t("officer.review.decision") }}</h2>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-tabler-x"
              square
              @click="open = false"
            />
          </div>
        </template>

        <form class="grid gap-4" @submit.prevent="submit">
          <UAlert v-if="error" color="error" variant="subtle" :title="error" />

          <URadioGroup v-model="decision" :items="decisionItems" orientation="vertical" />

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

          <div class="flex justify-end gap-2">
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
        </form>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  questions: Array<{ id?: string; question: string; options?: string[] }>;
}>();

const emit = defineEmits<{
  submit: [answers: Array<{ questionId: string; question: string; value: string }>];
}>();

const { t } = useI18n();

const submitted = ref(false);
const selections = ref<Record<number, string>>({});
const custom = ref<Record<number, string>>({});

function questionId(question: { id?: string }, index: number): string {
  return question.id ?? String(index);
}

function optionItems(question: { options?: string[] }) {
  return (question.options ?? []).map((option) => ({ label: option, value: option }));
}

function answerFor(index: number): string {
  const customValue = custom.value[index]?.trim();
  if (customValue) {
    return customValue;
  }
  return selections.value[index] ?? "";
}

const canSubmit = computed(
  () =>
    props.questions.length > 0 &&
    props.questions.every((_question, index) => answerFor(index).length > 0),
);

function submit() {
  if (!canSubmit.value || submitted.value) {
    return;
  }
  const answers = props.questions.map((question, index) => ({
    questionId: questionId(question, index),
    question: question.question,
    value: answerFor(index),
  }));
  submitted.value = true;
  emit("submit", answers);
}
</script>

<template>
  <div class="rounded-lg border border-primary/40 bg-primary/5 p-3">
    <div class="flex items-center gap-2">
      <UIcon name="i-tabler-help-circle" class="size-4 text-primary" />
      <p class="text-base font-medium text-highlighted">{{ t("assistant.clarification.title") }}</p>
    </div>

    <ul class="mt-2 space-y-3">
      <li v-for="(question, index) in questions" :key="question.id ?? index" class="space-y-2">
        <p class="text-base text-toned">{{ question.question }}</p>

        <div v-if="question.options?.length" class="space-y-1">
          <p class="text-sm font-medium text-muted">{{ t("assistant.clarification.choose") }}</p>
          <URadioGroup
            v-model="selections[index]"
            :items="optionItems(question)"
            :disabled="submitted"
            orientation="vertical"
          />
        </div>

        <UFormField :label="t('assistant.clarification.custom')">
          <UInput
            v-model="custom[index]"
            :placeholder="t('assistant.clarification.customPlaceholder')"
            :disabled="submitted"
            class="w-full"
          />
        </UFormField>
      </li>
    </ul>

    <div class="mt-3 flex justify-end">
      <UButton
        color="primary"
        :disabled="!canSubmit || submitted"
        :icon="submitted ? 'i-tabler-check' : undefined"
        :label="
          submitted ? t('assistant.clarification.submitted') : t('assistant.clarification.submit')
        "
        @click="submit"
      />
    </div>
  </div>
</template>

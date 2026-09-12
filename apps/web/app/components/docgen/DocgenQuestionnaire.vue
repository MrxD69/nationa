<script setup lang="ts">
import type { DocgenQuestion } from "@nationa/api/rpc/services/docgen.service";

const props = defineProps<{
  questions: DocgenQuestion[];
  modelValue: Record<string, string>;
}>();

const emit = defineEmits<{ (event: "update:modelValue", value: Record<string, string>): void }>();

const { t } = useI18n();

function setAnswer(questionId: string, value: string): void {
  emit("update:modelValue", { ...props.modelValue, [questionId]: value });
}

function answerFor(questionId: string): string {
  return props.modelValue[questionId] ?? "";
}

function optionsFor(question: DocgenQuestion) {
  return (question.options ?? []).map((option) => ({ label: option, value: option }));
}
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h2 class="text-sm font-semibold text-highlighted">
          {{ t("docgen.questionnaire.title") }}
        </h2>
        <p class="text-xs text-muted">{{ t("docgen.questionnaire.subtitle") }}</p>
      </div>
    </template>

    <div v-if="props.questions.length === 0" class="text-sm text-muted">
      {{ t("docgen.questionnaire.empty") }}
    </div>

    <div v-else class="grid gap-4">
      <UFormField v-for="question in props.questions" :key="question.id" :label="question.question">
        <USelect
          v-if="optionsFor(question).length > 0"
          :model-value="answerFor(question.id)"
          :items="optionsFor(question)"
          class="w-full"
          :placeholder="t('docgen.questionnaire.answerPlaceholder')"
          @update:model-value="setAnswer(question.id, String($event ?? ''))"
        />
        <UInput
          v-else
          :model-value="answerFor(question.id)"
          class="w-full"
          :placeholder="t('docgen.questionnaire.answerPlaceholder')"
          @update:model-value="setAnswer(question.id, String($event))"
        />
      </UFormField>
    </div>
  </UCard>
</template>

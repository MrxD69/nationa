<script setup lang="ts">
defineProps<{
  questions: Array<{ id?: string; question: string; options?: string[] }>;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="rounded-xl border border-primary/40 bg-primary/5 p-3">
    <div class="flex items-center gap-2">
      <UIcon name="i-tabler-help-circle" class="size-4 text-primary" />
      <p class="text-sm font-medium text-highlighted">{{ t("assistant.clarification.title") }}</p>
    </div>
    <ul class="mt-2 space-y-2">
      <li v-for="(question, index) in questions" :key="question.id ?? index" class="space-y-1">
        <p class="text-sm text-toned">{{ question.question }}</p>
        <div v-if="question.options?.length" class="flex flex-wrap gap-1">
          <UBadge
            v-for="option in question.options"
            :key="option"
            color="neutral"
            variant="subtle"
            size="sm"
            :label="option"
          />
        </div>
      </li>
    </ul>
    <p class="mt-2 text-xs text-muted">{{ t("assistant.clarification.hint") }}</p>
  </div>
</template>

<script setup lang="ts">
type FindingNote = {
  id: string;
  kind: "note" | "explanation";
  body: string;
  createdAt: string | Date;
};

const props = defineProps<{
  notes: FindingNote[];
  busy?: boolean;
}>();

const emit = defineEmits<{
  add: [body: string];
}>();

const { t, locale } = useI18n();

const draft = ref("");

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function submit() {
  const body = draft.value.trim();
  if (!body) {
    return;
  }
  emit("add", body);
  draft.value = "";
}
</script>

<template>
  <section class="space-y-3">
    <h3 class="text-base font-medium text-highlighted">{{ t("checks.notes.title") }}</h3>

    <div v-if="notes.length > 0" class="space-y-2">
      <UCard v-for="note in notes" :key="note.id">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <UBadge color="neutral" variant="soft" size="lg">
            {{ t(`checks.notes.kind.${note.kind}`) }}
          </UBadge>
          <span class="text-sm text-muted" dir="auto">{{ formatDate(note.createdAt) }}</span>
        </div>
        <p class="mt-2 whitespace-pre-wrap break-words text-base text-toned" dir="auto">
          {{ note.body }}
        </p>
      </UCard>
    </div>

    <p v-else class="text-base text-muted">{{ t("checks.notes.empty") }}</p>

    <div class="space-y-2">
      <UTextarea
        v-model="draft"
        :placeholder="t('checks.notes.placeholder')"
        :rows="3"
        autoresize
        class="w-full"
      />
      <div class="flex justify-end">
        <UButton
          icon="i-tabler-send"
          size="lg"
          :disabled="draft.trim().length === 0"
          :loading="busy"
          @click="submit"
        >
          {{ t("checks.actions.sendNote") }}
        </UButton>
      </div>
    </div>
  </section>
</template>

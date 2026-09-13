<script setup lang="ts">
definePageMeta({ layout: "app", middleware: "auth" });

const { t } = useI18n();
const { setOpen } = useAssistantPanel();

const faqItems = computed(() => [
  { label: t("help.faq.q1"), content: t("help.faq.a1") },
  { label: t("help.faq.q2"), content: t("help.faq.a2") },
  { label: t("help.faq.q3"), content: t("help.faq.a3") },
  { label: t("help.faq.q4"), content: t("help.faq.a4") },
]);
</script>

<template>
  <UContainer class="max-w-3xl space-y-8 py-8">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold text-highlighted">{{ t("help.title") }}</h1>
      <p class="text-base text-muted">{{ t("help.subtitle") }}</p>
    </div>

    <UAccordion :items="faqItems" />

    <UCard>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <p class="font-medium text-highlighted">{{ t("help.contact.label") }}</p>
          <p class="text-base text-muted">{{ t("help.contact.description") }}</p>
        </div>
        <UButton icon="i-tabler-sparkles" :label="t('shell.ai.open')" @click="setOpen(true)" />
      </div>
    </UCard>
  </UContainer>
</template>

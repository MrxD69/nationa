<script setup lang="ts">
import PageHeader from "~/components/ui/PageHeader.vue";
import SectionHeader from "~/components/ui/SectionHeader.vue";

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
  <div class="mx-auto w-full max-w-5xl space-y-8 py-8">
    <PageHeader
      :title="t('help.title')"
      :subtitle="t('help.subtitle')"
      icon="i-tabler-help-circle"
    />

    <section class="space-y-4">
      <SectionHeader :title="t('help.faq.title')" icon="i-tabler-messages" />
      <UAccordion :items="faqItems" />
    </section>

    <section class="space-y-4">
      <SectionHeader
        :title="t('help.contact.label')"
        icon="i-tabler-lifebuoy"
        :description="t('help.contact.description')"
      />
      <div class="flex flex-wrap items-center gap-2">
        <UButton icon="i-tabler-sparkles" :label="t('help.contact.cta')" @click="setOpen(true)" />
        <UButton
          color="neutral"
          variant="soft"
          icon="i-tabler-mail"
          :label="t('help.contact.email')"
          :href="`mailto:${t('help.contact.email')}`"
        />
      </div>
    </section>
  </div>
</template>

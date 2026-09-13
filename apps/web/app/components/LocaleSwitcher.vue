<script setup lang="ts">
type AppLocale = "fr" | "ar";

const { locale, locales, setLocale, t } = useI18n();

const items = computed(() =>
  (locales.value as Array<{ code: AppLocale; name?: string }>).map((l) => ({
    label: l.name ?? l.code,
    value: l.code,
  })),
);

const currentLocale = computed({
  get: () => locale.value,
  set: (value: AppLocale) => {
    void setLocale(value);
  },
});
</script>

<template>
  <USelect
    v-model="currentLocale"
    :items="items"
    icon="i-tabler-language"
    :aria-label="t('common.language.label')"
    size="lg"
    class="w-28 sm:w-36"
  />
</template>

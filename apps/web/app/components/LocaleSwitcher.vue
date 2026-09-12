<script setup lang="ts">
const { locale, locales, setLocale, t } = useI18n();

const items = computed(() =>
  (locales.value as Array<{ code: string; name?: string }>).map((l) => ({
    label: l.name ?? l.code,
    value: l.code,
  })),
);

const currentLocale = computed({
  get: () => locale.value,
  set: (value: string) => {
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
    size="sm"
    class="w-28 sm:w-36"
  />
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

type AppLocale = "fr" | "ar";

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

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

const currentCode = computed(() => String(locale.value).slice(0, 2).toUpperCase());

const menuItems = computed<DropdownMenuItem[]>(() =>
  items.value.map((item) => {
    const active = item.value === currentLocale.value;
    return {
      label: item.label,
      ...(active ? { icon: "i-tabler-check" } : {}),
      onSelect: () => {
        currentLocale.value = item.value;
      },
    };
  }),
);
</script>

<template>
  <UDropdownMenu v-if="compact" :items="menuItems" :content="{ align: 'start' }">
    <UButton
      color="neutral"
      variant="ghost"
      square
      class="press relative"
      :aria-label="t('common.language.label')"
      :title="t('common.language.label')"
    >
      <UIcon name="i-tabler-language" class="size-6 shrink-0" />
      <span
        class="absolute -end-0.5 -bottom-0.5 rounded bg-elevated px-1 text-[10px] font-semibold text-toned ring-1 ring-default"
      >
        {{ currentCode }}
      </span>
    </UButton>
  </UDropdownMenu>

  <USelect
    v-else
    v-model="currentLocale"
    :items="items"
    icon="i-tabler-language"
    :aria-label="t('common.language.label')"
    class="w-full min-w-0 sm:w-36"
  />
</template>

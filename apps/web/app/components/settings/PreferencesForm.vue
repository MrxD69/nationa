<script setup lang="ts">
type ThemePreference = "light" | "dark" | "system";
type AppLocale = "fr" | "ar";

type Preferences = {
  theme: string | null;
  aiInstructions: string | null;
  locale: string | null;
};

const props = defineProps<{ preferences: Preferences }>();

const client = useApi();
const { t, locale, setLocale } = useI18n();
const toast = useToast();
const colorMode = useColorMode();

const saving = ref(false);
const aiInstructions = ref(props.preferences.aiInstructions ?? "");

const theme = computed<ThemePreference>({
  get: () => {
    const value = colorMode.preference;
    return value === "dark" || value === "system" ? value : "light";
  },
  set: (value) => {
    colorMode.preference = value;
  },
});

const language = computed<AppLocale>({
  get: () => (locale.value === "ar" ? "ar" : "fr"),
  set: (value) => {
    void setLocale(value);
  },
});

const themeItems = computed(() => [
  { label: t("settings.theme.light"), value: "light" },
  { label: t("settings.theme.dark"), value: "dark" },
  { label: t("settings.theme.system"), value: "system" },
]);

const languageItems: Array<{ label: string; value: AppLocale }> = [
  { label: "Français", value: "fr" },
  { label: "العربية", value: "ar" },
];

const state = computed(() => ({
  theme: theme.value,
  locale: language.value,
  aiInstructions: aiInstructions.value,
}));

watch(
  () => props.preferences.aiInstructions,
  (value) => {
    aiInstructions.value = value ?? "";
  },
);

onMounted(() => {
  const { theme: savedTheme, locale: savedLocale } = props.preferences;
  if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
    colorMode.preference = savedTheme;
  }
  if ((savedLocale === "fr" || savedLocale === "ar") && savedLocale !== locale.value) {
    void setLocale(savedLocale);
  }
});

async function save() {
  saving.value = true;
  try {
    await client.preferences.update({
      theme: theme.value,
      aiInstructions: aiInstructions.value,
      locale: language.value,
    });
    toast.add({ title: t("settings.saved"), color: "success" });
  } catch {
    toast.add({ title: t("settings.error"), color: "error" });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UForm :state="state" class="grid gap-6" @submit="save">
    <UFormField :label="t('settings.theme.label')">
      <USelect v-model="theme" :items="themeItems" class="w-full sm:w-56" />
    </UFormField>

    <UFormField :label="t('settings.language.label')">
      <USelect v-model="language" :items="languageItems" class="w-full sm:w-56" />
    </UFormField>

    <UFormField
      :label="t('settings.aiInstructions.label')"
      :description="t('settings.aiInstructions.description')"
    >
      <UTextarea
        v-model="aiInstructions"
        :placeholder="t('settings.aiInstructions.placeholder')"
        :rows="5"
        class="w-full"
      />
    </UFormField>

    <div class="flex items-center justify-end">
      <UButton type="submit" :loading="saving" :disabled="saving" :label="t('settings.save')" />
    </div>
  </UForm>
</template>

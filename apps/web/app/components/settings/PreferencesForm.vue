<script setup lang="ts">
import SectionHeader from "~/components/ui/SectionHeader.vue";

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
const pristine = ref<string | null>(null);

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

function snapshot(): string {
  return JSON.stringify(state.value);
}

const dirty = computed(() => pristine.value !== null && pristine.value !== snapshot());

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
  pristine.value = snapshot();
});

async function save() {
  saving.value = true;
  try {
    await client.preferences.update({
      theme: theme.value,
      aiInstructions: aiInstructions.value,
      locale: language.value,
    });
    pristine.value = snapshot();
    toast.add({ title: t("settings.saved"), color: "success" });
  } catch {
    toast.add({ title: t("settings.error"), color: "error" });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UForm :state="state" class="space-y-8" @submit="save">
    <section class="space-y-4">
      <SectionHeader
        :title="t('settings.sections.preferences')"
        icon="i-tabler-adjustments"
        :level="2"
      />
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="t('settings.theme.label')">
          <USelect v-model="theme" :items="themeItems" class="w-full" />
        </UFormField>

        <UFormField :label="t('settings.language.label')">
          <USelect v-model="language" :items="languageItems" class="w-full" />
        </UFormField>
      </div>
    </section>

    <section class="space-y-4">
      <SectionHeader
        :title="t('settings.sections.assistant')"
        icon="i-tabler-sparkles"
        :level="2"
      />
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
    </section>

    <div class="flex flex-wrap items-center justify-end gap-3">
      <span v-if="dirty" class="text-sm text-muted">{{ t("settings.unsaved") }}</span>
      <UButton
        type="submit"
        :loading="saving"
        :disabled="saving || !dirty"
        :label="t('common.actions.save')"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import PreferencesForm from "~/components/settings/PreferencesForm.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const client = useApi();
const { t } = useI18n();

const {
  data: preferences,
  pending: loading,
  error,
} = await useAsyncData("settings-preferences", () => client.preferences.get());
</script>

<template>
  <UContainer class="max-w-3xl py-8">
    <div class="grid gap-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ t("settings.title") }}
        </h1>
        <p class="text-base text-muted">{{ t("settings.subtitle") }}</p>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="t('settings.error')"
        :description="error?.message"
      />

      <div v-if="loading" class="flex items-center gap-2 py-8 text-base text-muted">
        <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
        <span>{{ t("common.loading") }}</span>
      </div>

      <UCard v-else-if="preferences">
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">{{ t("settings.preferences") }}</h2>
        </template>
        <PreferencesForm :preferences="preferences" />
      </UCard>
    </div>
  </UContainer>
</template>

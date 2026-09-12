<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { $orpc } = useNuxtApp();
const { t } = useI18n();

const { data: onboarding } = await useAsyncData("entry-onboarding-status", async () => {
  try {
    return await $orpc.onboarding.get.call();
  } catch {
    return null;
  }
});

const status = onboarding.value?.status;
await navigateTo(status && status !== "completed" ? "/onboarding" : "/actions");
</script>

<template>
  <div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3">
    <span class="text-lg font-semibold text-highlighted">{{ t("common.appName") }}</span>
    <UIcon name="i-tabler-loader-2" class="size-6 animate-spin text-muted" />
    <span class="text-sm text-muted">{{ t("common.loading") }}</span>
  </div>
</template>

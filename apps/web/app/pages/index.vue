<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "auth" });

const { $orpc } = useNuxtApp();
const { t } = useI18n();

const { data: landing } = await useAsyncData("entry-landing", async () => {
  try {
    const session = await $orpc.session.get.call();
    return session.landing;
  } catch {
    return "/companies";
  }
});

await navigateTo(landing.value ?? "/companies");
</script>

<template>
  <div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3">
    <span class="text-lg font-semibold text-highlighted">{{ t("common.appName") }}</span>
    <UIcon name="i-tabler-loader-2" class="size-6 animate-spin text-muted" />
    <span class="text-sm text-muted">{{ t("common.loading") }}</span>
  </div>
</template>

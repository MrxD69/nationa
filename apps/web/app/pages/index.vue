<script setup lang="ts">
import LoadingState from "~/components/ui/LoadingState.vue";

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
  <div class="flex w-full flex-col items-center justify-center gap-2">
    <span class="text-lg font-semibold text-highlighted">{{ t("common.appName") }}</span>
    <LoadingState />
  </div>
</template>

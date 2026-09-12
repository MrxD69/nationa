<script setup lang="ts">
import { VueQueryDevtools } from "@tanstack/vue-query-devtools";

const { locale } = useI18n();

useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
    dir: locale.value === "ar" ? "rtl" : "ltr",
  },
}));
</script>

<template>
  <NuxtAnnouncer />
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator />
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
  <VueQueryDevtools />
</template>

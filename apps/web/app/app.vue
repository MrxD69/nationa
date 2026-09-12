<script setup lang="ts">
const VueQueryDevtools = import.meta.dev
  ? defineAsyncComponent(() =>
      import("@tanstack/vue-query-devtools").then((m) => m.VueQueryDevtools),
    )
  : null;

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
  <component :is="VueQueryDevtools" v-if="VueQueryDevtools" />
</template>

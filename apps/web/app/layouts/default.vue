<template>
  <div class="flex min-h-svh flex-col">
    <Header />

    <UMain class="flex-1">
      <div v-reveal="{ y: 12, duration: 0.4 }">
        <slot />
      </div>
    </UMain>

    <footer v-reveal="{ y: 8, duration: 0.35 }" class="border-t border-default py-6">
      <UContainer
        class="flex flex-col items-center justify-between gap-2 text-xs text-muted sm:flex-row"
      >
        <span class="font-medium text-toned">{{ $t("common.appName") }}</span>
        <span>{{ $t("common.footer.rights") }}</span>
      </UContainer>
    </footer>
  </div>
</template>

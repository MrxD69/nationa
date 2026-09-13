<script setup lang="ts">
const { t } = useI18n();

const benefits = ["benefit1", "benefit2", "benefit3"] as const;
</script>

<template>
  <div class="lg:grid lg:min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <aside
      class="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-primary/10 via-primary/5 to-transparent px-20 py-12 lg:flex xl:px-28"
    >
      <div
        class="pointer-events-none absolute -left-32 top-1/2 size-[28rem] -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div class="relative flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <UIcon name="i-tabler-building-bank" class="size-6" />
        </div>
        <span class="text-xl font-semibold tracking-tight text-highlighted">
          {{ t("common.appName") }}
        </span>
      </div>

      <div class="relative max-w-md space-y-8">
        <p class="page-title text-balance">{{ t("shell.auth.tagline") }}</p>
        <ul class="space-y-4">
          <li
            v-for="key in benefits"
            :key="key"
            class="flex items-start gap-3 text-base leading-relaxed text-toned"
          >
            <UIcon name="i-tabler-circle-check" class="mt-0.5 size-5 shrink-0 text-primary" />
            <span>{{ t(`shell.auth.${key}`) }}</span>
          </li>
        </ul>
      </div>

      <p class="relative text-sm text-muted">{{ t("common.footer.rights") }}</p>
    </aside>

    <main class="flex min-h-svh items-center justify-center p-4 sm:p-6">
      <slot />
    </main>
  </div>
</template>

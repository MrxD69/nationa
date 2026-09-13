<script setup lang="ts">
const { t } = useI18n();

const benefits = ["benefit1", "benefit2", "benefit3"] as const;
</script>

<template>
  <div class="lg:grid lg:min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <aside class="hidden flex-col justify-between bg-primary/5 p-10 lg:flex">
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <UIcon name="i-tabler-building-bank" class="size-6" />
        </div>
        <span class="text-xl font-semibold tracking-tight text-highlighted">
          {{ t("common.appName") }}
        </span>
      </div>

      <div class="space-y-6">
        <p class="page-title max-w-prose">{{ t("shell.auth.tagline") }}</p>
        <ul class="space-y-3">
          <li
            v-for="key in benefits"
            :key="key"
            class="flex items-center gap-3 text-base text-toned"
          >
            <UIcon name="i-tabler-circle-check" class="size-5 shrink-0 text-primary" />
            <span>{{ t(`shell.auth.${key}`) }}</span>
          </li>
        </ul>
      </div>

      <p class="text-sm text-muted">{{ t("common.footer.rights") }}</p>
    </aside>

    <main class="flex min-h-svh items-center justify-center p-4 sm:p-6">
      <slot />
    </main>
  </div>
</template>

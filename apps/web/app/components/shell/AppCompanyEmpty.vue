<template>
  <div class="flex min-h-[60vh] items-center justify-center p-6">
    <UCard class="w-full max-w-md">
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="flex size-12 items-center justify-center rounded-full bg-elevated">
          <UIcon name="i-tabler-building-skyscraper" class="size-6 text-muted" />
        </div>

        <div class="space-y-1">
          <p class="font-medium text-highlighted">{{ $t("shell.companyEmpty.title") }}</p>
          <p class="text-base text-muted">{{ $t("shell.companyEmpty.description") }}</p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <UButton
            to="/companies/new"
            icon="i-tabler-plus"
            :label="$t('shell.companyEmpty.create')"
          />
          <UButton
            to="/companies"
            color="neutral"
            variant="outline"
            icon="i-tabler-link"
            :label="$t('shell.companyEmpty.connect')"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>

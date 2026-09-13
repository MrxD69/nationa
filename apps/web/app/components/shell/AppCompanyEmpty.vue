<script setup lang="ts">
import EmptyState from "~/components/ui/EmptyState.vue";
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center p-6">
    <div class="w-full max-w-md">
      <EmptyState
        icon="i-tabler-building-skyscraper"
        :title="$t('shell.companyEmpty.title')"
        :description="$t('shell.companyEmpty.description')"
      >
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
      </EmptyState>
    </div>
  </div>
</template>

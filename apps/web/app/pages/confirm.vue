<script setup lang="ts">
const user = useSupabaseUser();

watch(
  user,
  (current) => {
    if (current) {
      navigateTo("/");
    }
  },
  { immediate: true },
);
</script>

<template>
  <UContainer class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
    <div class="flex items-center gap-2 text-sm text-muted">
      <UIcon name="i-lucide-loader-2" class="animate-spin" />
      <span>Confirming…</span>
    </div>
  </UContainer>
</template>

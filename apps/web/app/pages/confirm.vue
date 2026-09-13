<script setup lang="ts">
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

definePageMeta({ layout: "auth" });

const user = useSupabaseUser();
const { t } = useI18n();

const status = ref<"working" | "success" | "error">("working");
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  user,
  (current) => {
    if (current) {
      status.value = "success";
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      void navigateTo("/");
    }
  },
  { immediate: true },
);

onMounted(() => {
  fallbackTimer = setTimeout(() => {
    if (!user.value && status.value === "working") {
      status.value = "error";
    }
  }, 5000);
});

onBeforeUnmount(() => {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
  }
});
</script>

<template>
  <div class="w-full max-w-sm">
    <LoadingState v-if="status === 'working'" :label="t('auth.confirm.working')" />

    <UAlert
      v-else-if="status === 'success'"
      color="success"
      variant="subtle"
      :title="t('auth.confirm.success')"
    />

    <EmptyState v-else icon="i-tabler-alert-triangle" :title="t('auth.confirm.error')">
      <UButton to="/login" color="neutral" variant="soft" :label="t('auth.confirm.backToLogin')" />
    </EmptyState>
  </div>
</template>

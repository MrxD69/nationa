<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";
import { resolveCompanyPath } from "~/constants/navigation";

definePageMeta({ layout: "auth", middleware: "auth" });

const orpc = useApiUtils();
const route = useRoute();
const { t } = useI18n();

const token = computed(() => (typeof route.query.token === "string" ? route.query.token : ""));
const state = ref<"idle" | "working" | "success" | "error">("idle");
const result = ref<{ companyId: string } | null>(null);
const error = ref<string | null>(null);

const { mutateAsync: acceptInvitation } = useMutation(
  orpc.companies.acceptInvitation.mutationOptions(),
);

onMounted(async () => {
  if (!token.value) {
    error.value = t("companies.acceptInvite.missing");
    state.value = "error";
    return;
  }

  state.value = "working";
  try {
    result.value = await acceptInvitation({ token: token.value });
    state.value = "success";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    state.value = "error";
  }
});
</script>

<template>
  <UContainer class="flex min-h-[calc(100vh-4rem)] max-w-md items-center py-8">
    <UCard class="w-full">
      <template #header>
        <h1 class="text-lg font-medium text-highlighted">
          {{ t("companies.acceptInvite.title") }}
        </h1>
      </template>

      <div
        v-if="state === 'working' || state === 'idle'"
        class="flex items-center gap-2 text-base text-muted"
      >
        <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
        <span>{{ t("companies.acceptInvite.working") }}</span>
      </div>

      <div v-else-if="state === 'success'" class="grid gap-4">
        <UAlert color="success" variant="subtle" :title="t('companies.acceptInvite.success')" />
        <UButton
          v-if="result"
          :to="resolveCompanyPath('/companies/:companyId', result.companyId)"
          icon="i-tabler-arrow-right"
          block
          :label="t('companies.acceptInvite.open')"
        />
      </div>

      <div v-else class="grid gap-4">
        <UAlert
          color="error"
          variant="subtle"
          :title="t('companies.acceptInvite.error')"
          :description="error ?? undefined"
        />
        <UButton
          to="/companies"
          color="neutral"
          variant="soft"
          block
          :label="t('companies.detail.back')"
        />
      </div>
    </UCard>
  </UContainer>
</template>

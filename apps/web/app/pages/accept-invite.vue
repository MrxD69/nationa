<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";
import { resolveCompanyPath } from "~/constants/navigation";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

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
  <div class="w-full max-w-md space-y-6">
    <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
      {{ t("companies.acceptInvite.title") }}
    </h1>

    <LoadingState
      v-if="state === 'working' || state === 'idle'"
      :label="t('companies.acceptInvite.working')"
    />

    <div v-else-if="state === 'success'" class="grid gap-4">
      <UAlert color="success" variant="subtle" :title="t('companies.acceptInvite.success')" />
      <UButton
        v-if="result"
        :to="resolveCompanyPath('/companies/:companyId', result.companyId)"
        trailing-icon="i-tabler-arrow-right"
        :ui="{ trailingIcon: 'rtl:rotate-180' }"
        block
        :label="t('companies.acceptInvite.open')"
      />
    </div>

    <EmptyState
      v-else
      icon="i-tabler-link-off"
      :title="t('companies.acceptInvite.error')"
      :description="error ?? undefined"
    >
      <UButton to="/companies" color="neutral" variant="soft" :label="t('companies.detail.back')" />
    </EmptyState>
  </div>
</template>

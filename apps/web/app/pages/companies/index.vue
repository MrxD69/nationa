<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";
import CompanyList from "~/components/company/CompanyList.vue";
import AppCompanyEmpty from "~/components/shell/AppCompanyEmpty.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const orpc = useApiUtils();
const route = useRoute();
const { t } = useI18n();

const view = computed<"all" | "accounting">(() =>
  route.query.view === "accounting" ? "accounting" : "all",
);

const {
  data: companies,
  isPending: loading,
  isError,
} = useQuery(computed(() => orpc.companies.list.queryOptions({ input: { view: view.value } })));

const { mutateAsync: connectCompany, isPending: connecting } = useMutation(
  orpc.companies.connect.mutationOptions(),
);

const connectOpen = ref(false);
const identifier = ref("");
const connectError = ref<string | null>(null);

function setView(next: "all" | "accounting") {
  return navigateTo({
    path: "/companies",
    query: next === "accounting" ? { view: "accounting" } : {},
  });
}

async function submitConnect() {
  connectError.value = null;
  try {
    const result = await connectCompany({ uniqueIdentifier: identifier.value });
    connectOpen.value = false;
    identifier.value = "";
    await navigateTo(`/companies/${result.companyId}`);
  } catch (cause) {
    connectError.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
            {{ t("companies.title") }}
          </h1>
          <p class="text-sm text-muted">{{ t("companies.subtitle") }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-tabler-plug-connected"
            :label="t('companies.connect')"
            @click="connectOpen = true"
          />
          <UButton to="/companies/new" icon="i-tabler-plus" :label="t('companies.new')" />
        </div>
      </div>

      <div class="flex items-center gap-1 rounded-lg border border-default p-1">
        <UButton
          size="sm"
          :color="view === 'all' ? 'primary' : 'neutral'"
          :variant="view === 'all' ? 'solid' : 'ghost'"
          class="flex-1 sm:flex-none"
          :label="t('companies.viewAll')"
          @click="setView('all')"
        />
        <UButton
          size="sm"
          :color="view === 'accounting' ? 'primary' : 'neutral'"
          :variant="view === 'accounting' ? 'solid' : 'ghost'"
          class="flex-1 sm:flex-none"
          icon="i-tabler-briefcase"
          :label="t('companies.accountantView')"
          @click="setView('accounting')"
        />
      </div>

      <UAlert
        v-if="isError"
        color="error"
        variant="subtle"
        :title="t('companies.error.title')"
        :description="t('companies.error.description')"
      />

      <AppCompanyEmpty v-else-if="!loading && (companies?.length ?? 0) === 0" />

      <CompanyList v-else :companies="companies ?? []" :loading="loading" />
    </div>

    <UModal v-model:open="connectOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-medium text-highlighted">{{ t("companies.connectModal.title") }}</h2>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-tabler-x"
                square
                @click="connectOpen = false"
              />
            </div>
          </template>

          <form class="grid gap-4" @submit.prevent="submitConnect">
            <p class="text-sm text-muted">{{ t("companies.connectModal.description") }}</p>

            <UAlert v-if="connectError" color="error" variant="subtle" :title="connectError" />

            <UFormField :label="t('companies.connectModal.identifier')">
              <UInput
                v-model="identifier"
                required
                class="w-full"
                :placeholder="t('companies.connectModal.identifierPlaceholder')"
              />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                :label="t('companies.connectModal.cancel')"
                @click="connectOpen = false"
              />
              <UButton
                type="submit"
                :loading="connecting"
                :disabled="connecting || identifier.length === 0"
                :label="t('companies.connectModal.submit')"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

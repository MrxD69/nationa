<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";
import CompanyList from "~/components/company/CompanyList.vue";
import AppCompanyEmpty from "~/components/shell/AppCompanyEmpty.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const orpc = useApiUtils();
const { t } = useI18n();

/*
 * One list, always. The old "Portefeuille comptable" toggle filtered this same list
 * down to accounting grants, which is a strict subset of what is already shown — and
 * an identical list for anyone whose grants are all accounting grants. It also
 * rendered for every user, so an owner with no accounting grants could switch to it
 * and find nothing. Role is a property of each row here, not a separate space.
 */
const {
  data: companies,
  isPending: loading,
  isError,
} = useQuery(orpc.companies.list.queryOptions({ input: { view: "all" } }));

const search = ref("");
const roleFilter = ref<string | null>(null);

const allCompanies = computed(() => companies.value ?? []);

/** Only worth offering when the user actually holds more than one kind of role. */
const availableRoles = computed(() => {
  const roles = new Set<string>();
  for (const company of allCompanies.value) {
    if (company.role) {
      roles.add(company.role);
    }
  }
  return [...roles].sort();
});

const showRoleFilter = computed(() => availableRoles.value.length > 1);
const showSearch = computed(() => allCompanies.value.length > 6);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const visibleCompanies = computed(() => {
  const term = normalize(search.value.trim());
  const role = showRoleFilter.value ? roleFilter.value : null;

  return allCompanies.value.filter((company) => {
    if (role && company.role !== role) {
      return false;
    }
    if (!term) {
      return true;
    }
    const haystack = normalize(
      [company.legalName, company.legalNameAr, company.tradeName, company.uniqueIdentifier]
        .filter(Boolean)
        .join(" "),
    );
    return haystack.includes(term);
  });
});

const filtered = computed(() => visibleCompanies.value.length !== allCompanies.value.length);

const { mutateAsync: connectCompany, isPending: connecting } = useMutation(
  orpc.companies.connect.mutationOptions(),
);

const connectOpen = ref(false);
const identifier = ref("");
const connectError = ref<string | null>(null);

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
          <p class="text-base text-muted">{{ t("companies.subtitle") }}</p>
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

      <div v-if="showSearch || showRoleFilter" class="flex flex-col gap-3">
        <UInput
          v-if="showSearch"
          v-model="search"
          icon="i-tabler-search"
          class="w-full sm:max-w-md"
          :placeholder="t('companies.search')"
        />

        <div v-if="showRoleFilter" class="flex flex-wrap items-center gap-2">
          <UButton
            :color="roleFilter === null ? 'primary' : 'neutral'"
            :variant="roleFilter === null ? 'soft' : 'ghost'"
            :label="t('companies.allRoles')"
            @click="roleFilter = null"
          />
          <UButton
            v-for="role in availableRoles"
            :key="role"
            :color="roleFilter === role ? 'primary' : 'neutral'"
            :variant="roleFilter === role ? 'soft' : 'ghost'"
            :label="t(`companies.roles.${role}`)"
            @click="roleFilter = role"
          />
        </div>

        <p class="text-base text-muted">
          {{ t("companies.countAll", visibleCompanies.length) }}
        </p>
      </div>

      <UAlert
        v-if="isError"
        color="error"
        variant="subtle"
        :title="t('companies.error.title')"
        :description="t('companies.error.description')"
      />

      <AppCompanyEmpty v-else-if="!loading && allCompanies.length === 0" />

      <UAlert
        v-else-if="!loading && visibleCompanies.length === 0 && filtered"
        color="neutral"
        variant="soft"
        icon="i-tabler-search-off"
        :description="t('companies.noMatch')"
      />

      <CompanyList v-else :companies="visibleCompanies" :loading="loading" />
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
            <p class="text-base text-muted">{{ t("companies.connectModal.description") }}</p>

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

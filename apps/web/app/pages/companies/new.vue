<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";
import { COMPANY_FIELD_KEYS } from "@nationa/api/domain/fields";
import CompanyForm from "~/components/company/CompanyForm.vue";

definePageMeta({ middleware: "auth" });

const orpc = useApiUtils();
const { t } = useI18n();

type FormState = Record<string, unknown>;

function emptyForm(): FormState {
  const state: FormState = {};
  for (const key of COMPANY_FIELD_KEYS) {
    state[key] = key === "leasing" || key === "hasPledge" ? false : "";
  }
  return state;
}

function buildPayload(state: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const key of COMPANY_FIELD_KEYS) {
    const value = state[key];
    if (value === "" || value === null || value === undefined) {
      continue;
    }
    if (key === "headquartersAddress" || key === "activityAddress") {
      payload[key] = { raw: String(value) };
    } else if (key === "leasing" || key === "hasPledge") {
      payload[key] = Boolean(value);
    } else if (key === "capitalAmount") {
      payload[key] = String(value);
    } else if (key === "durationYears" || key === "secondaryEstablishmentsCount") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        payload[key] = parsed;
      }
    } else {
      payload[key] = value;
    }
  }
  return payload;
}

const form = ref<FormState>(emptyForm());
const asPortfolio = ref(false);
const error = ref<string | null>(null);

const { mutateAsync: createCompany, isPending: creating } = useMutation(
  orpc.companies.create.mutationOptions(),
);

async function submit() {
  error.value = null;
  try {
    const result = await createCompany({
      ...buildPayload(form.value),
      asPortfolio: asPortfolio.value,
    } as never);
    await navigateTo(`/companies/${result.companyId}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <UContainer class="max-w-4xl py-8">
    <div class="grid gap-6">
      <div class="flex items-center gap-2">
        <UButton
          to="/companies"
          color="neutral"
          variant="ghost"
          icon="i-tabler-arrow-left"
          size="sm"
          :label="t('companies.detail.back')"
        />
      </div>

      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ t("companies.create.title") }}
        </h1>
        <p class="text-sm text-muted">{{ t("companies.create.subtitle") }}</p>
      </div>

      <UAlert v-if="error" color="error" variant="subtle" :title="error" />

      <UCard>
        <CompanyForm
          v-model="form"
          v-model:as-portfolio="asPortfolio"
          show-portfolio
          :submitting="creating"
          :submit-label="t('companies.create.submit')"
          @submit="submit"
        />
      </UCard>
    </div>
  </UContainer>
</template>

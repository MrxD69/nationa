<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";
import { COMPANY_FIELD_KEYS } from "@nationa/api/domain/fields";
import CompanyForm from "~/components/company/CompanyForm.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const orpc = useApiUtils();
const route = useRoute();
const { t } = useI18n();

const companyId = computed(() => String(route.params.companyId ?? ""));

const { data, isPending } = useQuery(
  computed(() => orpc.companies.get.queryOptions({ input: { companyId: companyId.value } })),
);

type FormState = Record<string, unknown>;

function addressToText(value: unknown): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.raw === "string") {
    return record.raw;
  }
  const parts = record.fr as Record<string, unknown> | undefined;
  if (parts) {
    return [parts.street, parts.city, parts.governorate, parts.postalCode, parts.country]
      .filter((part) => typeof part === "string" && part.length > 0)
      .join(", ");
  }
  return "";
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

const form = ref<FormState>({});
const error = ref<string | null>(null);
const initialized = ref(false);

watch(data, (value) => {
  const loaded = value?.company as Record<string, unknown> | undefined;
  if (!loaded || initialized.value) {
    return;
  }
  initialized.value = true;
  const state: FormState = {};
  for (const key of COMPANY_FIELD_KEYS) {
    const raw = loaded[key];
    if (key === "headquartersAddress" || key === "activityAddress") {
      state[key] = addressToText(raw);
    } else if (key === "leasing" || key === "hasPledge") {
      state[key] = Boolean(raw);
    } else {
      state[key] = raw ?? "";
    }
  }
  form.value = state;
});

const { mutateAsync: updateCompany, isPending: saving } = useMutation(
  orpc.companies.update.mutationOptions(),
);

async function submit() {
  error.value = null;
  try {
    await updateCompany({
      companyId: companyId.value,
      patch: buildPayload(form.value),
    } as never);
    await navigateTo(`/companies/${companyId.value}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl">
    <div class="grid gap-6">
      <div class="flex items-center gap-2">
        <UButton
          :to="`/companies/${companyId}`"
          color="neutral"
          variant="ghost"
          icon="i-tabler-arrow-left"
          size="lg"
          class="rtl:rotate-180"
          :label="t('companies.detail.back')"
        />
      </div>

      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ t("companies.edit.title") }}
        </h1>
        <p class="text-base text-muted">{{ t("companies.edit.subtitle") }}</p>
      </div>

      <UAlert v-if="error" color="error" variant="subtle" :title="error" />

      <div v-if="isPending" class="flex items-center gap-2 text-base text-muted">
        <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
        <span>{{ t("companies.loading") }}</span>
      </div>

      <UCard v-else>
        <CompanyForm
          v-model="form"
          :submitting="saving"
          :submit-label="t('companies.edit.submit')"
          @submit="submit"
        />
      </UCard>
    </div>
  </div>
</template>

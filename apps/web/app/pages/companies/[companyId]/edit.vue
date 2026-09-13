<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";
import { COMPANY_FIELD_KEYS } from "@nationa/api/domain/fields";
import CompanyForm from "~/components/company/CompanyForm.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import StickyActionBar from "~/components/ui/StickyActionBar.vue";

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
  <div class="mx-auto w-full max-w-5xl space-y-6">
    <PageHeader
      :title="t('companies.edit.title')"
      :subtitle="t('companies.edit.subtitle')"
      icon="i-tabler-pencil"
      :back-to="`/companies/${companyId}`"
      :back-label="t('companies.detail.back')"
    />

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />

    <LoadingState v-if="isPending" />

    <CompanyForm
      v-else
      v-model="form"
      :submitting="saving"
      :submit-label="t('companies.edit.submit')"
      @submit="submit"
    >
      <template #actions>
        <StickyActionBar>
          <template #secondary>
            <p class="hidden text-sm text-muted sm:block">
              {{ t("companies.edit.stickyHint") }}
            </p>
          </template>
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            :to="`/companies/${companyId}`"
            :label="t('common.actions.cancel')"
          />
          <UButton
            type="submit"
            :loading="saving"
            :disabled="saving"
            :label="t('companies.edit.submit')"
          />
        </StickyActionBar>
      </template>
    </CompanyForm>
  </div>
</template>

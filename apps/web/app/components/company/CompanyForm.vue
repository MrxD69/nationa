<script setup lang="ts">
import { COMPANY_FIELD_KEYS, type CompanyFieldKey } from "@nationa/api/domain/fields";

const model = defineModel<Record<string, any>>({ required: true });
const asPortfolio = defineModel<boolean>("asPortfolio", { default: false });

const props = defineProps<{
  showPortfolio?: boolean;
  submitting?: boolean;
  submitLabel?: string;
}>();

const emit = defineEmits<{ submit: [] }>();

const { t } = useI18n();

type FieldGroup = { id: string; titleKey: string; fields: CompanyFieldKey[] };

const FIELD_GROUPS: FieldGroup[] = [
  {
    id: "identity",
    titleKey: "companies.form.groups.identity",
    fields: [
      "legalName",
      "legalNameAr",
      "tradeName",
      "brandName",
      "legalForm",
      "capitalAmount",
      "currency",
      "durationYears",
      "publicationDate",
    ],
  },
  {
    id: "registry",
    titleKey: "companies.form.groups.registry",
    fields: [
      "uniqueIdentifier",
      "internalManagementNumber",
      "registryType",
      "registryState",
      "taxId",
      "mentionDate",
    ],
  },
  {
    id: "activity",
    titleKey: "companies.form.groups.activity",
    fields: [
      "mainActivityLabel",
      "mainActivityLabelAr",
      "mainActivityCode",
      "activityStartDate",
      "secondaryEstablishmentsCount",
    ],
  },
  {
    id: "address",
    titleKey: "companies.form.groups.address",
    fields: ["headquartersAddress", "activityAddress"],
  },
  {
    id: "flags",
    titleKey: "companies.form.groups.flags",
    fields: ["leasing", "hasPledge", "fiscalDefault"],
  },
];

// Guarantee the form renders every canonical API field, even if one is added later.
const groupedFields = new Set(FIELD_GROUPS.flatMap((group) => group.fields));
for (const key of COMPANY_FIELD_KEYS) {
  if (!groupedFields.has(key)) {
    FIELD_GROUPS[FIELD_GROUPS.length - 1]?.fields.push(key);
  }
}

const selectItems = computed<Record<string, { label: string; value: string }[]>>(() => ({
  registryType: [
    { label: t("companies.registryType.societe"), value: "societe" },
    { label: t("companies.registryType.entreprise"), value: "entreprise" },
  ],
  registryState: [
    { label: t("companies.registryState.actif"), value: "actif" },
    { label: t("companies.registryState.suspendu"), value: "suspendu" },
    { label: t("companies.registryState.radie"), value: "radie" },
  ],
  fiscalDefault: [
    { label: t("companies.fiscalDefault.none"), value: "none" },
    { label: t("companies.fiscalDefault.months_12_24"), value: "months_12_24" },
    { label: t("companies.fiscalDefault.over_24_months"), value: "over_24_months" },
    { label: t("companies.fiscalDefault.unknown"), value: "unknown" },
  ],
}));

const textareaFields = new Set<string>(["headquartersAddress", "activityAddress"]);
const numberFields = new Set<string>([
  "capitalAmount",
  "durationYears",
  "secondaryEstablishmentsCount",
]);
const booleanFields = new Set<string>(["leasing", "hasPledge"]);

function inputType(key: string): "number" | "text" {
  return numberFields.has(key) ? "number" : "text";
}
</script>

<template>
  <form class="grid gap-8" @submit.prevent="emit('submit')">
    <section v-for="group in FIELD_GROUPS" :key="group.id" class="grid gap-4">
      <h3 class="text-sm font-semibold text-highlighted">{{ t(group.titleKey) }}</h3>

      <div class="grid gap-4 sm:grid-cols-2">
        <template v-for="key in group.fields" :key="key">
          <div v-if="booleanFields.has(key)" class="flex items-center pt-1">
            <UCheckbox v-model="model[key]" :label="t(`companies.form.${key}`)" />
          </div>

          <UFormField v-else :label="t(`companies.form.${key}`)">
            <USelect
              v-if="selectItems[key]"
              v-model="model[key]"
              :items="selectItems[key]"
              class="w-full"
            />
            <UTextarea
              v-else-if="textareaFields.has(key)"
              v-model="model[key]"
              :rows="2"
              class="w-full"
            />
            <UInput
              v-else
              v-model="model[key]"
              :type="inputType(key)"
              :required="key === 'legalName'"
              :placeholder="key === 'currency' ? 'TND' : undefined"
              class="w-full"
            />
          </UFormField>
        </template>
      </div>
    </section>

    <div v-if="props.showPortfolio" class="rounded-lg border border-default p-4">
      <UCheckbox v-model="asPortfolio" :label="t('companies.create.portfolio')" />
    </div>

    <div class="flex items-center justify-end gap-3">
      <slot name="actions">
        <UButton
          type="submit"
          :loading="props.submitting"
          :disabled="props.submitting"
          :label="props.submitLabel ?? t('common.actions.save')"
        />
      </slot>
    </div>
  </form>
</template>

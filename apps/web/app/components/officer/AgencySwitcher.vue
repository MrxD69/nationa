<script setup lang="ts">
type AgencyOption = {
  id: string;
  nameFr: string;
  nameAr?: string | null;
  role?: string;
};

const props = defineProps<{ agencies: AgencyOption[] }>();

const model = defineModel<string | null>({ default: null });

const { t, locale } = useI18n();

const selected = computed<string | undefined>({
  get: () => model.value ?? undefined,
  set: (value) => {
    model.value = value ?? null;
  },
});

const options = computed(() =>
  props.agencies.map((agency) => ({
    label:
      locale.value === "ar"
        ? agency.nameAr || agency.nameFr
        : agency.nameFr || agency.nameAr || agency.id,
    value: agency.id,
  })),
);
</script>

<template>
  <USelect
    v-model="selected"
    :items="options"
    :placeholder="t('officer.agency.placeholder')"
    icon="i-tabler-building-bank"
    class="w-full sm:w-64"
  />
</template>

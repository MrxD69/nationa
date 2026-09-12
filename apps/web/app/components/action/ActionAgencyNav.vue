<script setup lang="ts">
type AgencyOption = {
  id: string;
  nameFr: string | null;
  nameAr: string | null;
};

const props = defineProps<{
  agencies: AgencyOption[];
  modelValue?: string;
  allLabel?: string;
}>();

const emit = defineEmits<{ (event: "update:modelValue", value: string | undefined): void }>();

const { locale, t } = useI18n();

const AGENCY_ORDER = ["RNE", "DGI", "CNSS", "APII", "BCT"];

const ordered = computed(() =>
  [...props.agencies].sort((a, b) => AGENCY_ORDER.indexOf(a.id) - AGENCY_ORDER.indexOf(b.id)),
);

function agencyLabel(agency: AgencyOption): string {
  const name = locale.value === "ar" ? (agency.nameAr ?? agency.nameFr) : agency.nameFr;
  return name ?? agency.id;
}

function select(agencyId: string | undefined): void {
  emit("update:modelValue", agencyId);
}
</script>

<template>
  <nav
    class="flex flex-wrap items-center gap-1.5"
    :aria-label="t('actions.title')"
    v-reveal="{ y: 10, duration: 0.4 }"
  >
    <UButton
      size="sm"
      :color="props.modelValue === undefined ? 'primary' : 'neutral'"
      :variant="props.modelValue === undefined ? 'soft' : 'ghost'"
      :label="props.allLabel ?? t('actions.agencies.all')"
      @click="select(undefined)"
    />
    <UButton
      v-for="agency in ordered"
      :key="agency.id"
      size="sm"
      :color="props.modelValue === agency.id ? 'primary' : 'neutral'"
      :variant="props.modelValue === agency.id ? 'soft' : 'ghost'"
      :title="agencyLabel(agency)"
      :label="t(`actions.agencies.${agency.id}`, agency.id)"
      @click="select(agency.id)"
    />
  </nav>
</template>

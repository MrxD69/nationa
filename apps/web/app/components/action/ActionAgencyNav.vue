<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";

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

/*
 * Chips stay on one line and scroll sideways on a phone; wrapping five logos
 * over three ragged rows makes the filter look like content.
 */
const CHIP_BASE =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-control focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none";
const CHIP_ON = "border-primary bg-primary/10 text-primary";
const CHIP_OFF = "border-default bg-default text-toned hover-surface";
</script>

<template>
  <nav
    class="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    :aria-label="t('actions.filters.agencyLabel')"
    v-reveal="{ y: 10, duration: 0.4 }"
  >
    <button
      type="button"
      class="snap-start"
      :class="[CHIP_BASE, props.modelValue === undefined ? CHIP_ON : CHIP_OFF]"
      :aria-pressed="props.modelValue === undefined"
      @click="select(undefined)"
    >
      <UIcon name="i-tabler-layout-grid" class="size-4 shrink-0" />
      <span class="leading-tight">{{ props.allLabel ?? t("actions.agencies.all") }}</span>
    </button>

    <button
      v-for="agency in ordered"
      :key="agency.id"
      type="button"
      class="snap-start"
      :class="[CHIP_BASE, props.modelValue === agency.id ? CHIP_ON : CHIP_OFF]"
      :aria-pressed="props.modelValue === agency.id"
      :title="agencyLabel(agency)"
      @click="select(agency.id)"
    >
      <AgencyMark :agency-id="agency.id" size="xs" :alt="agencyLabel(agency)" />
      <span class="leading-tight">{{ t(`actions.agencies.${agency.id}`, agency.id) }}</span>
    </button>
  </nav>
</template>

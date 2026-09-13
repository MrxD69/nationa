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

const TILE_BASE =
  "flex min-h-30 w-30 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const TILE_ON = "border-primary bg-primary/10 text-primary";
const TILE_OFF = "border-default bg-default text-toned hover:border-accented hover:bg-elevated";
</script>

<template>
  <nav
    class="flex flex-wrap items-stretch gap-3"
    :aria-label="t('actions.title')"
    v-reveal="{ y: 10, duration: 0.4 }"
  >
    <button
      type="button"
      :class="[TILE_BASE, props.modelValue === undefined ? TILE_ON : TILE_OFF]"
      :aria-pressed="props.modelValue === undefined"
      @click="select(undefined)"
    >
      <UIcon name="i-tabler-layout-grid" class="size-18 p-3" />
      <span class="text-base leading-tight font-semibold">
        {{ props.allLabel ?? t("actions.agencies.all") }}
      </span>
    </button>

    <button
      v-for="agency in ordered"
      :key="agency.id"
      type="button"
      :class="[TILE_BASE, props.modelValue === agency.id ? TILE_ON : TILE_OFF]"
      :aria-pressed="props.modelValue === agency.id"
      :title="agencyLabel(agency)"
      @click="select(agency.id)"
    >
      <AgencyMark :agency-id="agency.id" size="lg" :alt="agencyLabel(agency)" />
      <span class="text-base leading-tight font-semibold">
        {{ t(`actions.agencies.${agency.id}`, agency.id) }}
      </span>
    </button>
  </nav>
</template>

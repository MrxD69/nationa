<script setup lang="ts">
/**
 * Renders an agency's own logo instead of a generic glyph, because the people
 * using this platform recognise the RNE / DGI / APII marks far faster than they
 * read an abbreviation. Agencies we have no artwork for — or whose artwork fails
 * to load — fall back to a large, high-contrast text badge rather than a broken image.
 */
const props = withDefaults(
  defineProps<{
    agencyId: string;
    size?: "sm" | "md" | "lg";
    alt?: string;
  }>(),
  { size: "lg" },
);

const LOGOS: Record<string, string> = {
  rne: "/agencies/rne.png",
  dgi: "/agencies/dgi.jpg",
  apii: "/agencies/apii.png",
};

const BOX_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "size-10",
  md: "size-14",
  lg: "size-18",
};

const TEXT_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

const failed = ref(false);

const key = computed(() => props.agencyId.trim().toLowerCase());
const logo = computed(() => LOGOS[key.value] ?? null);
const label = computed(() => props.agencyId.trim().toUpperCase());
const showLogo = computed(() => !!logo.value && !failed.value);
const logoSrc = computed(() => logo.value ?? "");

watch(logo, () => {
  failed.value = false;
});
</script>

<template>
  <span
    :class="[
      BOX_CLASS[props.size],
      'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-default',
      showLogo ? 'bg-white p-1.5' : 'bg-elevated',
    ]"
  >
    <img
      v-if="showLogo"
      :src="logoSrc"
      :alt="props.alt ?? label"
      class="img-outline size-full object-contain"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    />
    <span v-else :class="[TEXT_CLASS[props.size], 'font-bold tracking-tight text-toned']">
      {{ label }}
    </span>
  </span>
</template>

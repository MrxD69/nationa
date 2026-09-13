<script setup lang="ts">
import type { OfficialForm } from "~/constants/forms";

const props = defineProps<{ form: OfficialForm }>();

const { locale, t } = useI18n();

const name = computed(() =>
  locale.value.startsWith("ar") ? props.form.nameAr : props.form.nameFr,
);
</script>

<template>
  <a
    :href="props.form.pdf"
    target="_blank"
    rel="noopener"
    class="hover-lift flex items-center gap-4 rounded-lg border border-default p-3 transition-control hover:border-primary"
  >
    <img
      :src="props.form.thumb"
      :alt="name"
      width="96"
      height="136"
      loading="lazy"
      decoding="async"
      class="img-outline h-34 w-24 shrink-0 rounded-md bg-white object-cover object-top"
    />

    <span class="min-w-0 flex-1 space-y-1.5">
      <span class="block text-base leading-6 font-semibold text-highlighted">{{ name }}</span>
      <span class="block text-sm leading-6 text-muted">{{ t("actions.step.formHint") }}</span>
      <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        <UIcon name="i-tabler-external-link" class="size-4" />
        {{ t("actions.step.openForm") }}
      </span>
    </span>
  </a>
</template>

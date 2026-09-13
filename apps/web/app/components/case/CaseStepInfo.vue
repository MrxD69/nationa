<script setup lang="ts">
type Citation = {
  id: string;
  source: string;
  article?: string | null;
  titleFr?: string | null;
  titleAr?: string | null;
  textFr?: string | null;
  textAr?: string | null;
  url?: string | null;
};

type InfoStep = {
  titleFr: string;
  titleAr?: string | null;
  description?: string | null;
  citations?: Citation[];
};

const props = defineProps<{ step: InfoStep }>();

const { locale, t } = useI18n();

const description = computed(() => props.step.description ?? "");

function citationTitle(citation: Citation): string {
  if (locale.value === "ar") {
    return citation.titleAr ?? citation.titleFr ?? citation.source;
  }
  return citation.titleFr ?? citation.titleAr ?? citation.source;
}

function citationText(citation: Citation): string {
  if (locale.value === "ar") {
    return citation.textAr ?? citation.textFr ?? "";
  }
  return citation.textFr ?? citation.textAr ?? "";
}
</script>

<template>
  <div class="grid gap-4">
    <p v-if="description" class="text-base leading-6 text-muted">{{ description }}</p>

    <div v-if="props.step.citations?.length" class="grid gap-3">
      <h3 class="text-base font-medium text-highlighted">{{ t("cases.citations.title") }}</h3>
      <UCard v-for="citation in props.step.citations" :key="citation.id">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="neutral" variant="subtle" size="lg">{{ citation.source }}</UBadge>
            <span v-if="citation.article" class="text-sm text-muted">{{ citation.article }}</span>
          </div>
          <div class="text-base font-medium text-highlighted">{{ citationTitle(citation) }}</div>
          <p v-if="citationText(citation)" class="text-base leading-6 text-muted">
            {{ citationText(citation) }}
          </p>
          <UButton
            v-if="citation.url"
            :to="citation.url"
            target="_blank"
            external
            size="lg"
            color="neutral"
            variant="link"
            icon="i-tabler-external-link"
            :label="t('cases.citations.source')"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>

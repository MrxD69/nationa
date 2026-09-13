<script setup lang="ts">
const props = defineProps<{
  rule: {
    source?: string | null;
    article?: string | null;
    titleFr?: string | null;
    titleAr?: string | null;
    textFr?: string | null;
    textAr?: string | null;
    url?: string | null;
  };
  snippet?: string | null;
}>();

const { t, locale } = useI18n();

const title = computed(() => {
  if (locale.value === "ar" && props.rule.titleAr) {
    return props.rule.titleAr;
  }
  return props.rule.titleFr || props.rule.titleAr || props.rule.source || "";
});

const body = computed(() => {
  if (locale.value === "ar" && props.rule.textAr) {
    return props.rule.textAr;
  }
  return props.rule.textFr || props.rule.textAr || props.snippet || "";
});
</script>

<template>
  <div class="rounded-xl border border-default bg-elevated/40 p-3">
    <div class="flex items-start gap-2">
      <UIcon name="i-tabler-gavel" class="mt-0.5 size-4 shrink-0 text-muted" />
      <div class="min-w-0 flex-1 space-y-1">
        <div class="flex flex-wrap items-center gap-2" dir="ltr">
          <UBadge
            color="neutral"
            variant="subtle"
            size="lg"
            :label="rule.source || t('assistant.citation.title')"
          />
          <span v-if="rule.article" class="text-sm font-medium text-toned">{{ rule.article }}</span>
        </div>
        <p v-if="title" class="text-base font-medium text-highlighted">{{ title }}</p>
        <p v-if="body" class="line-clamp-4 text-sm leading-5 text-muted" dir="ltr">{{ body }}</p>
        <UButton
          v-if="rule.url"
          :to="rule.url"
          target="_blank"
          external
          color="neutral"
          variant="link"
          size="lg"
          icon="i-tabler-external-link"
          :label="t('assistant.citation.open')"
        />
      </div>
    </div>
  </div>
</template>

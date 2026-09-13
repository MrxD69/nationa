<script setup lang="ts">
type ComparedRef = {
  kind: string;
  source: string;
  field?: string | null;
  labelKey?: string | null;
  ref?: string | null;
  documentVersionId?: string | null;
  value: string | null;
};

const props = defineProps<{
  refs: ComparedRef[];
  mismatch?: boolean;
}>();

const { t, te } = useI18n();

function sourceLabel(source: string): string {
  const key = `checks.sources.${source}`;
  return te(key) ? t(key) : source;
}

function fieldLabel(ref: ComparedRef): string {
  if (ref.labelKey && te(ref.labelKey)) {
    return t(ref.labelKey);
  }
  return ref.field ?? "";
}

function normalize(value: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isDivergent(index: number): boolean {
  if (index === 0) {
    return false;
  }
  const first = props.refs[0]?.value ?? null;
  const current = props.refs[index]?.value ?? null;
  return normalize(first) !== normalize(current);
}
</script>

<template>
  <section class="space-y-2">
    <h3 class="text-base font-medium text-highlighted">{{ t("checks.compared.title") }}</h3>

    <div v-if="refs.length > 0" class="grid gap-3 sm:grid-cols-2">
      <UCard
        v-for="(ref, index) in refs"
        :key="`${ref.source}-${ref.field ?? index}`"
        :class="isDivergent(index) ? 'ring-2 ring-error' : ''"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <UBadge color="neutral" variant="soft" size="lg">
            {{ sourceLabel(ref.source) }}
          </UBadge>
          <UBadge
            v-if="isDivergent(index)"
            color="error"
            variant="soft"
            size="lg"
            icon="i-tabler-alert-triangle"
          >
            {{ t("checks.compared.mismatch") }}
          </UBadge>
        </div>

        <p v-if="fieldLabel(ref)" class="mt-2 text-sm text-muted">{{ fieldLabel(ref) }}</p>
        <p class="mt-1 break-words text-base font-medium text-highlighted" dir="auto">
          {{ ref.value ?? "—" }}
        </p>
      </UCard>
    </div>

    <p v-else class="text-base text-muted">{{ t("checks.compared.empty") }}</p>
  </section>
</template>

<script setup lang="ts">
type DossierSectionData = {
  agencyId: string;
  nameFr: string;
  nameAr?: string | null;
  submissions: number;
  pending: number;
  findings: number;
  filings: number;
  documents: number;
  lastActivityAt?: string | Date | null;
};

const props = withDefaults(
  defineProps<{
    section: DossierSectionData;
    agencyIdForLink?: string | null;
  }>(),
  { agencyIdForLink: null },
);

const { t, locale } = useI18n();

const name = computed(() => {
  const { nameFr, nameAr } = props.section;
  return locale.value === "ar" ? nameAr || nameFr : nameFr || nameAr || "—";
});

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return t("officerTrust.dossier.lastActivityUnknown");
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? t("officerTrust.dossier.lastActivityUnknown")
    : date.toLocaleDateString(locale.value);
}
</script>

<template>
  <tr class="text-sm">
    <td class="px-4 py-2 align-middle">
      <div class="flex min-w-0 items-center gap-2">
        <UIcon name="i-tabler-building-bank" class="size-4 shrink-0 text-muted" />
        <span class="min-w-0 truncate font-medium text-highlighted">{{ name }}</span>
      </div>
    </td>
    <td class="px-4 py-2 text-end tabular text-highlighted">{{ section.submissions ?? 0 }}</td>
    <td class="px-4 py-2 text-end tabular text-highlighted">{{ section.pending ?? 0 }}</td>
    <td class="px-4 py-2 text-end tabular text-highlighted">{{ section.findings ?? 0 }}</td>
    <td class="px-4 py-2 text-end tabular text-highlighted">{{ section.filings ?? 0 }}</td>
    <td class="px-4 py-2 text-end tabular text-highlighted">{{ section.documents ?? 0 }}</td>
    <td class="px-4 py-2 text-end whitespace-nowrap text-muted">
      {{ formatDate(section.lastActivityAt) }}
    </td>
    <td class="px-4 py-2 text-end">
      <UButton
        v-if="agencyIdForLink"
        :to="{ path: '/officer', query: { agencyId: agencyIdForLink } }"
        size="md"
        color="neutral"
        variant="soft"
        icon="i-tabler-list-check"
        :label="t('officerTrust.dossier.viewQueue')"
      />
      <span v-else class="text-muted">—</span>
    </td>
  </tr>
</template>

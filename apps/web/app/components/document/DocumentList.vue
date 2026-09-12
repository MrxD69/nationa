<script setup lang="ts">
import type { DocumentBundleItem, DocumentTypeItem } from "~/composables/useUpload";
import DocumentCard from "~/components/document/DocumentCard.vue";

const props = defineProps<{
  items: DocumentBundleItem[];
  types?: DocumentTypeItem[];
  selectedId?: string | null;
  reprocessingId?: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{ select: [id: string]; reprocess: [id: string] }>();

const { t, locale } = useI18n();

const UNKNOWN_TYPE = "__none__";

function nameFor(id: string, typeMap: Map<string, DocumentTypeItem>): string {
  if (id === UNKNOWN_TYPE) {
    return t("documents.list.typeUnknown");
  }
  const type = typeMap.get(id);
  if (!type) {
    return t("documents.list.typeUnknown");
  }
  return (locale.value === "ar" ? type.nameAr : type.nameFr) || type.nameFr;
}

const groups = computed(() => {
  const typeMap = new Map((props.types ?? []).map((type) => [type.id, type]));
  const order: string[] = [];
  const buckets = new Map<string, DocumentBundleItem[]>();

  for (const item of props.items) {
    const key = item.document.documentTypeId ?? UNKNOWN_TYPE;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)?.push(item);
  }

  return order.map((id) => ({
    id,
    name: nameFor(id, typeMap),
    items: buckets.get(id) ?? [],
  }));
});
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-sm text-muted">
      <UIcon name="i-tabler-loader-2" class="size-5 animate-spin" />
      {{ t("documents.list.loading") }}
    </div>

    <div
      v-else-if="items.length === 0"
      class="rounded-xl border border-dashed border-default py-12"
    >
      <div class="flex flex-col items-center gap-2 text-center">
        <UIcon name="i-tabler-files-off" class="size-8 text-muted" />
        <p class="text-sm font-medium text-toned">{{ t("documents.list.empty") }}</p>
        <p class="text-xs text-muted">{{ t("documents.list.emptyHint") }}</p>
      </div>
    </div>

    <div v-else class="space-y-6">
      <section v-for="group in groups" :key="group.id" class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-highlighted">{{ group.name }}</h2>
          <UBadge color="neutral" variant="subtle" :label="String(group.items.length)" />
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <DocumentCard
            v-for="item in group.items"
            :key="item.document.id"
            :bundle="item"
            :type-name="group.name"
            :selected="item.document.id === selectedId"
            :reprocessing="reprocessingId === item.document.id"
            @select="emit('select', $event)"
            @reprocess="emit('reprocess', $event)"
          />
        </div>
      </section>
    </div>
  </div>
</template>

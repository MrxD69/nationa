<script setup lang="ts">
import type { DocumentBundleItem, DocumentTypeItem } from "~/composables/useUpload";
import DocumentCard from "~/components/document/DocumentCard.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import EmptyState from "~/components/ui/EmptyState.vue";

const props = defineProps<{
  items: DocumentBundleItem[];
  types?: DocumentTypeItem[];
  selectedId?: string | null;
  reprocessingId?: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
  reprocess: [id: string];
  upload: [];
}>();

const { t, locale } = useI18n();

const UNKNOWN_TYPE = "__none__";

function nameFor(id: string, typeMap: Map<string, DocumentTypeItem>): string {
  if (id === UNKNOWN_TYPE) {
    return t("documents.groups.uncategorized");
  }
  const type = typeMap.get(id);
  if (!type) {
    return t("documents.groups.uncategorized");
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
  <div>
    <LoadingState v-if="loading" variant="skeleton-list" :label="t('documents.list.loading')" />

    <EmptyState
      v-else-if="items.length === 0"
      icon="i-tabler-files-off"
      :title="t('documents.list.empty')"
      :description="t('documents.list.emptyHint')"
    >
      <UButton
        color="primary"
        icon="i-tabler-plus"
        :label="t('documents.list.emptyAction')"
        @click="emit('upload')"
      />
    </EmptyState>

    <div v-else class="divide-y divide-default overflow-hidden rounded-lg border border-default">
      <details v-for="group in groups" :key="group.id" open>
        <summary
          class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 transition-colors hover:bg-accented [&::-webkit-details-marker]:hidden"
        >
          <UIcon
            name="i-tabler-chevron-down"
            class="size-4 shrink-0 text-muted transition-transform [[details:not([open])_&]:-rotate-90]"
          />
          <span class="min-w-0 flex-1 truncate text-sm font-semibold text-toned">
            {{ group.name }}
          </span>
          <UBadge color="neutral" variant="soft" size="sm" :label="String(group.items.length)" />
        </summary>
        <div class="divide-y divide-default border-t border-default">
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
      </details>
    </div>
  </div>
</template>

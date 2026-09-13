<script setup lang="ts">
import type { DocumentBundleItem, DocumentTypeItem } from "~/composables/useUpload";
import DocumentCard from "~/components/document/DocumentCard.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

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
  <div class="w-full">
    <LoadingState v-if="loading" variant="skeleton-list" :label="t('documents.list.loading')" />

    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center gap-2 px-2 py-12 text-center"
    >
      <div class="flex size-12 items-center justify-center rounded-full bg-accented text-muted">
        <UIcon name="i-tabler-files-off" class="size-6" />
      </div>
      <p class="text-base font-semibold text-highlighted">{{ t("documents.list.empty") }}</p>
      <p class="text-base text-muted">{{ t("documents.list.emptyHint") }}</p>
      <UButton
        color="primary"
        icon="i-tabler-plus"
        :label="t('documents.list.emptyAction')"
        @click="emit('upload')"
      />
    </div>

    <div v-else class="divide-y divide-default">
      <details v-for="group in groups" :key="group.id" open>
        <summary
          class="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 transition-[background-color,color] duration-150 ease-out hover:bg-accented focus-visible:bg-accented focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
        >
          <UIcon
            name="i-tabler-chevron-down"
            class="size-4 shrink-0 text-muted transition-[transform] duration-200 ease-out [[details:not([open])_&]:-rotate-90]"
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

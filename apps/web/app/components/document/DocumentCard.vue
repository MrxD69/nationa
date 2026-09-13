<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { DocumentBundleItem } from "~/composables/useUpload";
import ExtractionStatus from "~/components/document/ExtractionStatus.vue";

const props = defineProps<{
  bundle: DocumentBundleItem;
  typeName?: string | null;
  selected?: boolean;
  reprocessing?: boolean;
}>();

const emit = defineEmits<{ select: [id: string]; reprocess: [id: string] }>();

const { t } = useI18n();

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) {
    return "—";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index] ?? "B"}`;
}

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString();
}

const document = computed(() => props.bundle.document);
const version = computed(() => props.bundle.version);

const meta = computed(() =>
  [
    formatSize(version.value?.size),
    `v${version.value?.version ?? 1}`,
    formatDate(document.value.createdAt),
  ].join(" · "),
);

const menuItems = computed<DropdownMenuItem[]>(() => [
  {
    label: t("documents.list.view"),
    icon: "i-tabler-eye",
    onSelect: () => emit("select", document.value.id),
  },
  {
    label: t("documents.extraction.reprocess"),
    icon: "i-tabler-reload",
    onSelect: () => emit("reprocess", document.value.id),
  },
]);
</script>

<template>
  <div
    class="group flex min-h-11 w-full cursor-pointer items-start gap-3 border-s-2 px-3 py-2.5 transition-[background-color,color,border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
    :class="
      selected
        ? 'border-s-primary bg-primary/10 text-primary'
        : 'border-s-transparent hover:bg-accented focus-visible:bg-accented'
    "
    role="button"
    tabindex="0"
    :aria-selected="selected"
    @click="emit('select', document.id)"
    @keydown.enter="emit('select', document.id)"
    @keydown.space.prevent="emit('select', document.id)"
  >
    <div
      class="flex size-9 shrink-0 items-center justify-center rounded-md"
      :class="selected ? 'bg-primary/15 text-primary' : 'bg-accented text-muted'"
    >
      <UIcon name="i-tabler-file-text" class="size-5" />
    </div>

    <div class="min-w-0 flex-1">
      <p class="truncate text-base font-medium text-highlighted">
        {{ document.title || t("documents.list.untitled") }}
      </p>
      <p class="truncate text-sm text-muted">{{ meta }}</p>
    </div>

    <div class="flex shrink-0 items-center gap-1">
      <ExtractionStatus :status="document.status" class="hidden sm:inline-flex" />

      <UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-tabler-dots-vertical"
          size="sm"
          square
          class="min-h-11 min-w-11"
          :loading="reprocessing"
          :aria-label="t('documents.list.rowMenu')"
          :title="t('documents.list.rowMenu')"
          @click.stop
          @keydown.stop
        />
      </UDropdownMenu>
    </div>
  </div>
</template>

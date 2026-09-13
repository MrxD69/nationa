<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type Member = {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  role?: string | null;
  openCount: number;
  decidedCount: number;
  avgDecisionHours?: number | null;
};

const props = withDefaults(defineProps<{ members: Member[]; loading?: boolean }>(), {
  loading: false,
});

const { t, locale, te } = useI18n();

const rows = computed(() =>
  [...props.members].sort((a, b) => (b.openCount ?? 0) - (a.openCount ?? 0)),
);

const maxOpen = computed(() => Math.max(1, ...rows.value.map((member) => member.openCount ?? 0)));

function memberName(member: Member): string {
  return member.displayName || member.email || "—";
}

function roleLabel(role?: string | null): string {
  if (!role) {
    return "—";
  }
  const key = `officerOps.team.roles.${role}`;
  return te(key) ? t(key) : role;
}

function progress(member: Member): number {
  return Math.round(((member.openCount ?? 0) / maxOpen.value) * 100);
}

function formatAvg(hours?: number | null): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) {
    return "—";
  }
  const formatter = (value: number) =>
    value.toLocaleString(locale.value, { maximumFractionDigits: 1 });
  if (hours < 24) {
    return t("officerOps.team.hours", { value: formatter(hours) });
  }
  return t("officerOps.team.days", { value: formatter(hours / 24) });
}

const columns = computed<TableColumn<Member>[]>(() => [
  {
    accessorKey: "displayName",
    header: t("officerOps.team.columns.member"),
    cell: ({ row }) =>
      h("div", { class: "min-w-0" }, [
        h(
          "p",
          { class: "truncate text-sm font-medium text-highlighted" },
          memberName(row.original),
        ),
        row.original.email
          ? h("p", { class: "truncate text-sm text-muted" }, row.original.email)
          : null,
      ]),
  },
  {
    accessorKey: "role",
    header: t("officerOps.team.columns.role"),
    cell: ({ row }) => h("span", { class: "text-sm text-toned" }, roleLabel(row.original.role)),
  },
  {
    accessorKey: "openCount",
    header: t("officerOps.team.columns.open"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "tabular text-sm font-semibold text-highlighted" },
        String(row.original.openCount ?? 0),
      ),
  },
  {
    accessorKey: "decidedCount",
    header: t("officerOps.team.columns.decided"),
    cell: ({ row }) =>
      h("span", { class: "tabular text-sm text-toned" }, String(row.original.decidedCount ?? 0)),
  },
  {
    accessorKey: "avgDecisionHours",
    header: t("officerOps.team.columns.avg"),
    cell: ({ row }) =>
      h("span", { class: "tabular text-sm text-toned" }, formatAvg(row.original.avgDecisionHours)),
  },
  {
    id: "load",
    header: t("officerOps.team.columns.load"),
    cell: ({ row }) =>
      h("div", { class: "w-40" }, [
        h(resolveComponent("UProgress"), {
          modelValue: progress(row.original),
          size: "sm",
        }),
      ]),
  },
]);
</script>

<template>
  <div class="space-y-4">
    <LoadingState
      v-if="loading && members.length === 0"
      variant="skeleton-rows"
      :count="5"
      :label="t('officerOps.common.loading')"
    />

    <EmptyState
      v-else-if="members.length === 0"
      icon="i-tabler-users-group"
      :title="t('officerOps.team.empty')"
      :description="t('officerOps.team.emptyDescription')"
    />

    <template v-else>
      <div class="hidden overflow-x-auto md:block">
        <UTable
          :data="rows"
          :columns="columns"
          :loading="loading"
          :ui="{
            base: 'w-full min-w-[44rem]',
            th: 'border-0 px-4 py-2 text-sm',
            td: 'border-0 px-4 py-2 text-sm',
          }"
        />
      </div>

      <ul
        class="divide-y divide-default border-y border-default md:hidden"
        :aria-label="t('officerOps.team.title')"
      >
        <li v-for="member in rows" :key="member.userId" class="space-y-3 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-base font-medium text-highlighted">
                {{ memberName(member) }}
              </p>
              <p v-if="member.email" dir="ltr" class="truncate text-sm text-muted">
                {{ member.email }}
              </p>
            </div>
            <UBadge color="neutral" variant="subtle" size="lg">
              {{ roleLabel(member.role) }}
            </UBadge>
          </div>

          <dl class="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt class="text-muted">{{ t("officerOps.team.columns.open") }}</dt>
              <dd class="tabular text-base font-semibold text-highlighted">
                {{ member.openCount ?? 0 }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">{{ t("officerOps.team.columns.decided") }}</dt>
              <dd class="tabular text-base text-toned">{{ member.decidedCount ?? 0 }}</dd>
            </div>
            <div>
              <dt class="text-muted">{{ t("officerOps.team.columns.avg") }}</dt>
              <dd class="tabular text-base text-toned">{{ formatAvg(member.avgDecisionHours) }}</dd>
            </div>
          </dl>

          <div class="space-y-1">
            <p class="text-sm text-muted">{{ t("officerOps.team.columns.load") }}</p>
            <UProgress :model-value="progress(member)" size="sm" />
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

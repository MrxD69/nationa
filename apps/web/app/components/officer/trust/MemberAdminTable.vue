<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type MemberRow = {
  userId: string;
  email: string;
  displayName?: string | null;
  role: string;
  status: string;
  addedAt?: string | Date | null;
  isSelf?: boolean;
};

const props = withDefaults(
  defineProps<{
    members: MemberRow[];
    canManage: boolean;
    currentUserId?: string | null;
    loading?: boolean;
  }>(),
  { currentUserId: null, loading: false },
);

const emit = defineEmits<{
  edit: [{ userId: string; role: string }];
  setStatus: [{ userId: string; status: string }];
  remove: [{ userId: string }];
}>();

const { t, te, locale } = useI18n();

const ButtonComp = resolveComponent("UButton");
const BadgeComp = resolveComponent("UBadge");

const tableUi = {
  base: "w-full min-w-[44rem]",
  th: "px-4 py-2 whitespace-nowrap",
  td: "px-4 py-2 whitespace-normal align-middle",
};

const roleOptions = computed(() => [
  { label: t("officerTrust.agency.roleLabels.officer"), value: "officer" },
  { label: t("officerTrust.agency.roleLabels.supervisor"), value: "supervisor" },
  { label: t("officerTrust.agency.roleLabels.admin"), value: "admin" },
]);

function isSelf(member: MemberRow): boolean {
  return (
    Boolean(member.isSelf) ||
    (props.currentUserId !== null && member.userId === props.currentUserId)
  );
}

const activeAdminIds = computed(() =>
  props.members
    .filter((member) => member.role === "admin" && member.status === "active")
    .map((member) => member.userId),
);

function isLastActiveAdmin(member: MemberRow): boolean {
  return activeAdminIds.value.length === 1 && activeAdminIds.value[0] === member.userId;
}

function displayName(member: MemberRow): string {
  return member.displayName || member.email;
}

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return t("officerTrust.common.none");
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? t("officerTrust.common.none")
    : date.toLocaleDateString(locale.value);
}

function roleLabel(role: string): string {
  const key = `officerTrust.agency.roleLabels.${role}`;
  return te(key) ? t(key) : t("officerTrust.common.unknown");
}

function roleColor(role: string): "primary" | "info" | "neutral" {
  if (role === "admin") {
    return "primary";
  }
  return role === "supervisor" ? "info" : "neutral";
}

function statusLabel(status: string): string {
  const key = `officerTrust.agency.statusLabels.${status}`;
  return te(key) ? t(key) : t("officerTrust.common.unknown");
}

function statusColor(status: string): "success" | "info" | "warning" | "error" | "neutral" {
  switch (status) {
    case "active":
      return "success";
    case "invited":
      return "info";
    case "suspended":
      return "warning";
    case "revoked":
      return "error";
    default:
      return "neutral";
  }
}

function roleBadge(role: string) {
  return h(BadgeComp, {
    color: roleColor(role),
    variant: "subtle",
    label: roleLabel(role),
  });
}

function statusBadge(status: string) {
  return h(BadgeComp, {
    color: statusColor(status),
    variant: "subtle",
    label: statusLabel(status),
  });
}

function openRole(member: MemberRow) {
  roleTarget.value = member;
  roleDraft.value = member.role;
}

function openStatus(member: MemberRow, status: "suspended" | "active") {
  statusTarget.value = { member, status };
}

function openRemove(member: MemberRow) {
  removeTarget.value = member;
}

function confirmRole() {
  const target = roleTarget.value;
  if (!target || !roleDraft.value || roleDraft.value === target.role) {
    roleTarget.value = null;
    return;
  }
  emit("edit", { userId: target.userId, role: roleDraft.value });
  roleTarget.value = null;
}

function confirmStatus() {
  const target = statusTarget.value;
  if (!target) {
    return;
  }
  emit("setStatus", { userId: target.member.userId, status: target.status });
  statusTarget.value = null;
}

function confirmRemove() {
  const target = removeTarget.value;
  if (!target) {
    return;
  }
  emit("remove", { userId: target.userId });
  removeTarget.value = null;
}

const roleTarget = ref<MemberRow | null>(null);
const roleDraft = ref<string>("");
const statusTarget = ref<{ member: MemberRow; status: "suspended" | "active" } | null>(null);
const removeTarget = ref<MemberRow | null>(null);

const columns = computed<TableColumn<MemberRow>[]>(() => [
  {
    accessorKey: "displayName",
    header: t("officerTrust.agency.columns.agent"),
    cell: ({ row }) =>
      h("div", { class: "min-w-0" }, [
        h("div", { class: "flex items-center gap-2" }, [
          h(
            "span",
            { class: "truncate text-sm font-medium text-highlighted" },
            displayName(row.original),
          ),
          isSelf(row.original)
            ? h(BadgeComp, {
                color: "primary",
                variant: "soft",
                label: t("officerTrust.agency.self"),
              })
            : null,
        ]),
        h("span", { class: "block truncate text-xs text-muted", dir: "ltr" }, row.original.email),
      ]),
  },
  {
    accessorKey: "role",
    header: t("officerTrust.agency.columns.role"),
    cell: ({ row }) => roleBadge(row.original.role),
  },
  {
    accessorKey: "status",
    header: t("officerTrust.agency.columns.status"),
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    accessorKey: "addedAt",
    header: t("officerTrust.agency.columns.addedAt"),
    cell: ({ row }) => h("span", { class: "text-sm text-muted" }, formatDate(row.original.addedAt)),
  },
  {
    id: "actions",
    header: t("officerTrust.agency.columns.actions"),
    cell: ({ row }) => {
      const member = row.original;
      if (!props.canManage) {
        return h("span", { class: "text-sm text-muted" }, "—");
      }
      const destructiveDisabled = isSelf(member) || isLastActiveAdmin(member);
      const buttons = [
        h(ButtonComp, {
          color: "neutral",
          variant: "soft",
          size: "md",
          icon: "i-tabler-user-cog",
          label: t("officerTrust.agency.changeRole"),
          disabled: isSelf(member),
          onClick: () => openRole(member),
        }),
      ];
      if (member.status === "suspended") {
        buttons.push(
          h(ButtonComp, {
            color: "success",
            variant: "soft",
            size: "md",
            icon: "i-tabler-user-check",
            label: t("officerTrust.agency.reactivate"),
            onClick: () => openStatus(member, "active"),
          }),
        );
      } else {
        buttons.push(
          h(ButtonComp, {
            color: "warning",
            variant: "soft",
            size: "md",
            icon: "i-tabler-user-pause",
            label: t("officerTrust.agency.suspend"),
            disabled: destructiveDisabled,
            onClick: () => openStatus(member, "suspended"),
          }),
        );
      }
      buttons.push(
        h(ButtonComp, {
          color: "error",
          variant: "soft",
          size: "md",
          icon: "i-tabler-user-minus",
          label: t("officerTrust.agency.revoke"),
          disabled: destructiveDisabled,
          onClick: () => openRemove(member),
        }),
      );
      return h("div", { class: "flex flex-wrap items-center gap-2" }, buttons);
    },
  },
]);
</script>

<template>
  <div class="space-y-4">
    <LoadingState
      v-if="loading && members.length === 0"
      variant="skeleton-rows"
      :count="4"
      :label="t('officerTrust.agency.loading')"
    />

    <EmptyState
      v-else-if="members.length === 0"
      icon="i-tabler-users-group"
      :title="t('officerTrust.agency.empty')"
      :description="t('officerTrust.agency.emptyDescription')"
    />

    <template v-else>
      <div class="hidden overflow-x-auto md:block">
        <UTable
          :data="members"
          :columns="columns"
          :loading="loading"
          :empty="t('officerTrust.agency.empty')"
          :ui="tableUi"
        />
      </div>

      <ul class="divide-y divide-default md:hidden" :aria-label="t('officerTrust.agency.title')">
        <li v-for="member in members" :key="member.userId" class="space-y-2 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="flex flex-wrap items-center gap-2 text-sm font-medium text-highlighted">
                <span class="min-w-0 truncate">{{ displayName(member) }}</span>
                <UBadge
                  v-if="isSelf(member)"
                  color="primary"
                  variant="soft"
                  :label="t('officerTrust.agency.self')"
                />
              </p>
              <p class="truncate text-xs text-muted" dir="ltr">{{ member.email }}</p>
            </div>
            <UBadge
              :color="statusColor(member.status)"
              variant="subtle"
              :label="statusLabel(member.status)"
              class="shrink-0"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              :color="roleColor(member.role)"
              variant="subtle"
              :label="roleLabel(member.role)"
            />
            <span class="text-xs text-muted">
              {{ t("officerTrust.agency.columns.addedAt") }}: {{ formatDate(member.addedAt) }}
            </span>
          </div>

          <div v-if="canManage" class="flex flex-wrap items-center gap-2">
            <UButton
              color="neutral"
              variant="soft"
              size="md"
              icon="i-tabler-user-cog"
              :label="t('officerTrust.agency.changeRole')"
              :disabled="isSelf(member)"
              @click="openRole(member)"
            />
            <UButton
              v-if="member.status === 'suspended'"
              color="success"
              variant="soft"
              size="md"
              icon="i-tabler-user-check"
              :label="t('officerTrust.agency.reactivate')"
              @click="openStatus(member, 'active')"
            />
            <UButton
              v-else
              color="warning"
              variant="soft"
              size="md"
              icon="i-tabler-user-pause"
              :label="t('officerTrust.agency.suspend')"
              :disabled="isSelf(member) || isLastActiveAdmin(member)"
              @click="openStatus(member, 'suspended')"
            />
            <UButton
              color="error"
              variant="soft"
              size="md"
              icon="i-tabler-user-minus"
              :label="t('officerTrust.agency.revoke')"
              :disabled="isSelf(member) || isLastActiveAdmin(member)"
              @click="openRemove(member)"
            />
          </div>
        </li>
      </ul>
    </template>

    <UModal
      :open="roleTarget !== null"
      :title="t('officerTrust.agency.changeRoleTitle')"
      @update:open="(value) => !value && (roleTarget = null)"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">{{ t("officerTrust.agency.changeRoleBody") }}</p>
          <UFormField :label="t('officerTrust.agency.roleLabel')">
            <USelect v-model="roleDraft" :items="roleOptions" size="md" class="w-full" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            :label="t('officerTrust.common.cancel')"
            @click="roleTarget = null"
          />
          <UButton
            icon="i-tabler-check"
            size="md"
            :label="t('officerTrust.agency.confirmChangeRole')"
            @click="confirmRole"
          />
        </div>
      </template>
    </UModal>

    <UModal
      :open="statusTarget !== null"
      :title="
        statusTarget?.status === 'suspended'
          ? t('officerTrust.agency.suspendTitle')
          : t('officerTrust.agency.reactivateTitle')
      "
      @update:open="(value) => !value && (statusTarget = null)"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{
            statusTarget?.status === "suspended"
              ? t("officerTrust.agency.suspendBody")
              : t("officerTrust.agency.reactivateBody")
          }}
        </p>
      </template>

      <template #footer>
        <div class="flex w-full items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            :label="t('officerTrust.common.cancel')"
            @click="statusTarget = null"
          />
          <UButton
            :color="statusTarget?.status === 'suspended' ? 'warning' : 'success'"
            size="md"
            :icon="
              statusTarget?.status === 'suspended' ? 'i-tabler-user-pause' : 'i-tabler-user-check'
            "
            :label="
              statusTarget?.status === 'suspended'
                ? t('officerTrust.agency.confirmSuspend')
                : t('officerTrust.agency.confirmReactivate')
            "
            @click="confirmStatus"
          />
        </div>
      </template>
    </UModal>

    <UModal
      :open="removeTarget !== null"
      :title="t('officerTrust.agency.revokeTitle')"
      @update:open="(value) => !value && (removeTarget = null)"
    >
      <template #body>
        <p class="text-sm text-muted">{{ t("officerTrust.agency.revokeBody") }}</p>
      </template>

      <template #footer>
        <div class="flex w-full items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            :label="t('officerTrust.common.cancel')"
            @click="removeTarget = null"
          />
          <UButton
            color="error"
            icon="i-tabler-user-minus"
            size="md"
            :label="t('officerTrust.agency.confirmRevoke')"
            @click="confirmRemove"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

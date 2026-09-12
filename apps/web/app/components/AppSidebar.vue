<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";

const { t } = useI18n();
const { user, signOut } = useAuth();

const items = computed<NavigationMenuItem[]>(() => [
  { type: "label", label: t("common.bodies.title") },
  {
    label: t("common.bodies.rne"),
    icon: "i-tabler-building-bank",
    defaultOpen: true,
    active: true,
    badge: { label: t("common.status.active"), color: "primary", variant: "solid", size: "sm" },
    children: [
      {
        label: t("common.nav.companies"),
        to: "/companies",
        icon: "i-tabler-building-skyscraper",
      },
      {
        label: t("common.nav.cases"),
        to: "/cases",
        icon: "i-tabler-list-check",
      },
      { label: t("common.nav.documents"), to: "/companies", icon: "i-tabler-files" },
    ],
  },
  {
    label: t("common.bodies.dgi"),
    icon: "i-tabler-receipt-tax",
    class: "text-muted",
    children: [
      { label: t("common.nav.invoices"), to: "/companies", icon: "i-tabler-file-invoice" },
      { label: t("common.nav.filings"), to: "/companies", icon: "i-tabler-file-check" },
    ],
  },
  {
    label: t("common.bodies.cnss"),
    icon: "i-tabler-shield-heart",
    class: "text-muted",
    children: [
      {
        label: t("common.nav.contributions"),
        to: "/companies",
        icon: "i-tabler-coin",
      },
      { label: t("common.nav.employees"), to: "/companies", icon: "i-tabler-users" },
    ],
  },
  {
    label: t("common.bodies.apii"),
    icon: "i-tabler-rocket",
    class: "text-muted",
    children: [
      {
        label: t("common.nav.applications"),
        to: "/companies",
        icon: "i-tabler-file-stack",
      },
      { label: t("common.nav.incentives"), to: "/companies", icon: "i-tabler-award" },
    ],
  },
  {
    label: t("common.bodies.bct"),
    icon: "i-tabler-currency-dollar",
    class: "text-muted",
    children: [
      { label: t("common.nav.checks"), to: "/findings", icon: "i-tabler-shield-check" },
      { label: t("common.nav.submissions"), to: "/submissions", icon: "i-tabler-send" },
    ],
  },
]);

const userMenuItems = computed<DropdownMenuItem[]>(() => [
  { type: "label", label: user.value?.email ?? t("common.user.guest") },
  { type: "separator" },
  { label: t("common.actions.signOut"), icon: "i-tabler-logout", onSelect: () => signOut() },
]);
</script>

<template>
  <UDashboardSidebar
    id="workspace"
    collapsible
    resizable
    :default-size="17"
    :min-size="15"
    :max-size="28"
    :collapsed-size="4"
  >
    <template #header="{ collapsed }">
      <NuxtLink
        v-if="!collapsed"
        v-reveal="{ direction: 'inline-start', distance: 12, duration: 0.4 }"
        to="/companies"
        class="flex min-w-0 items-center gap-2.5"
      >
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-inverted shadow-xs"
        >
          <UIcon name="i-tabler-building-bank" class="size-5" />
        </span>
        <span class="truncate text-sm font-semibold tracking-tight text-highlighted">
          {{ $t("common.appName") }}
        </span>
      </NuxtLink>

      <UDashboardSidebarCollapse class="lg:mx-auto" />
    </template>

    <template #default="{ collapsed }">
      <div v-reveal="{ y: 10, duration: 0.4, delay: 0.05 }" class="w-full">
        <UNavigationMenu
          :items="items"
          orientation="vertical"
          :collapsed="collapsed"
          tooltip
          popover
          color="primary"
          highlight
          class="w-full"
        />
      </div>
    </template>

    <template #footer="{ collapsed }">
      <div v-reveal="{ y: 8, duration: 0.35, delay: 0.1 }" class="w-full">
        <UDropdownMenu :items="userMenuItems" :content="{ align: 'start' }" class="w-full">
          <UButton
            block
            color="neutral"
            variant="ghost"
            :square="collapsed"
            :class="collapsed ? '' : 'justify-start'"
          >
            <UAvatar :alt="user?.email ?? ''" size="2xs" icon="i-tabler-user" />
            <span v-if="!collapsed" class="truncate text-sm">
              {{ user?.email ?? $t("common.user.guest") }}
            </span>
          </UButton>
        </UDropdownMenu>
      </div>
    </template>
  </UDashboardSidebar>
</template>

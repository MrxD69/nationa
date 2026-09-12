<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import AppRailNotifications from "~/components/shell/AppRailNotifications.vue";
import { RAIL_ITEMS, dirForLocale } from "~/constants/navigation";

const { t, locale } = useI18n();
const { user, signOut } = useAuth();
const { toggle: toggleCommandPalette } = useCommandPalette();
const route = useRoute();

const side = computed(() => (dirForLocale(locale.value) === "rtl" ? "right" : "left"));

const userMenuItems = computed<DropdownMenuItem[]>(() => [
  { type: "label", label: user.value?.email ?? t("common.user.guest") },
  { type: "separator" },
  { label: t("shell.rail.settings"), icon: "i-tabler-settings", to: "/settings" },
  { type: "separator" },
  { label: t("common.actions.signOut"), icon: "i-tabler-logout", onSelect: () => signOut() },
]);

function isActive(to?: string): boolean {
  if (!to) {
    return false;
  }
  return route.path === to || route.path.startsWith(`${to}/`);
}
</script>

<template>
  <UDashboardSidebar
    id="app-rail"
    :side="side"
    :toggle-side="side"
    collapsible
    :default-size="16"
    :min-size="14"
    :max-size="20"
    :collapsed-size="4"
  >
    <template #header="{ collapsed }">
      <UDropdownMenu
        :items="userMenuItems"
        :content="{ align: 'start' }"
        :class="collapsed ? '' : 'min-w-0 flex-1'"
      >
        <UButton
          color="neutral"
          variant="ghost"
          :square="collapsed"
          :block="!collapsed"
          :class="collapsed ? '' : 'justify-start'"
          :aria-label="t('shell.rail.profile')"
          :title="t('shell.rail.profile')"
        >
          <UAvatar :alt="user?.email ?? ''" size="2xs" icon="i-tabler-user" />
          <span v-if="!collapsed" class="truncate text-sm">
            {{ user?.email ?? t("common.user.guest") }}
          </span>
        </UButton>
      </UDropdownMenu>
    </template>

    <template #default="{ collapsed }">
      <nav class="flex w-full flex-col gap-1">
        <template v-for="item in RAIL_ITEMS" :key="item.key">
          <AppRailNotifications v-if="item.action === 'notifications'" />

          <UButton
            v-else
            :to="item.action === 'search' ? undefined : item.to"
            :icon="item.icon"
            :label="collapsed ? undefined : t(item.labelKey)"
            :aria-label="t(item.labelKey)"
            :title="t(item.labelKey)"
            :active="isActive(item.to)"
            active-color="primary"
            active-variant="soft"
            color="neutral"
            variant="ghost"
            :square="collapsed"
            :block="!collapsed"
            class="justify-start"
            @click="item.action === 'search' ? toggleCommandPalette() : undefined"
          />
        </template>
      </nav>
    </template>

    <template #footer="{ collapsed }">
      <div class="flex w-full flex-col items-center gap-1.5">
        <LocaleSwitcher v-if="!collapsed" />
        <UColorModeButton />

        <UButton
          to="/companies"
          icon="i-tabler-building-bank"
          :label="collapsed ? undefined : t('shell.rail.logoLabel')"
          :aria-label="t('shell.rail.logoLabel')"
          :title="t('shell.rail.logoLabel')"
          color="neutral"
          variant="ghost"
          :square="collapsed"
          :block="!collapsed"
          class="justify-start"
        />

        <UDashboardSidebarCollapse :side="side" />
      </div>
    </template>
  </UDashboardSidebar>
</template>

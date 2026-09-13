<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import AppRailPinnedActions from "~/components/shell/AppRailPinnedActions.vue";
import { dirForLocale } from "~/constants/navigation";

const { t, locale } = useI18n();
const { user, signOut } = useAuth();
const route = useRoute();
const visibleRailItems = useVisibleRailItems();

const side = computed(() => (dirForLocale(locale.value) === "rtl" ? "right" : "left"));

const displayName = computed(
  () =>
    (user.value?.user_metadata?.displayName as string | undefined)?.trim() ||
    user.value?.email ||
    t("common.user.guest"),
);
const email = computed(() => user.value?.email ?? "");

const userMenuItems = computed<DropdownMenuItem[]>(() => [
  {
    type: "label",
    label: displayName.value,
    description: email.value && email.value !== displayName.value ? email.value : undefined,
  },
  { type: "separator" },
  { label: t("shell.rail.settings"), icon: "i-tabler-settings", to: "/settings" },
  { type: "separator" },
  { label: t("common.actions.signOut"), icon: "i-tabler-logout", onSelect: () => signOut() },
]);

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`);
}

function startsSection(index: number): boolean {
  const items = visibleRailItems.value;
  return index === 0 || items[index]?.section !== items[index - 1]?.section;
}
</script>

<template>
  <UDashboardSidebar
    id="app-rail"
    :side="side"
    :toggle-side="side"
    :menu="{ side, modal: false }"
    collapsible
    :default-size="16"
    :min-size="14"
    :max-size="20"
    :collapsed-size="4"
  >
    <template #header="{ collapsed }">
      <div class="flex w-full min-w-0 items-center gap-1">
        <NuxtLink
          v-if="!collapsed"
          to="/companies"
          class="press hover-surface flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-highlighted"
          :aria-label="t('common.appName')"
        >
          <UIcon name="i-tabler-building-bank" class="size-6 shrink-0 text-primary" />
          <span class="truncate text-base font-semibold">
            {{ t("common.appName") }}
          </span>
        </NuxtLink>

        <div class="hidden shrink-0 lg:flex" :class="collapsed ? 'mx-auto' : ''">
          <UDashboardSidebarCollapse :side="side" />
        </div>
      </div>
    </template>

    <template #default="{ collapsed }">
      <nav class="flex w-full flex-col gap-1.5">
        <template v-for="(item, index) in visibleRailItems" :key="item.key">
          <span
            v-if="!collapsed && startsSection(index)"
            class="px-2 pb-1 text-xs font-medium tracking-wide text-dimmed uppercase"
            :class="index === 0 ? '' : 'pt-3'"
          >
            {{ t(`shell.rail.sections.${item.section}`) }}
          </span>

          <UButton
            :to="item.to"
            :icon="item.icon"
            :label="collapsed ? undefined : (item.label ?? t(item.labelKey))"
            :aria-label="
              item.badgeCount
                ? t('shell.rail.recommendedCount', { count: item.badgeCount })
                : (item.label ?? t(item.labelKey))
            "
            :title="item.label ?? t(item.labelKey)"
            :active="isActive(item.to)"
            active-color="primary"
            active-variant="soft"
            color="neutral"
            variant="ghost"
            :square="collapsed"
            :block="!collapsed"
            class="relative justify-start transition-colors"
          >
            <template v-if="!collapsed && item.badgeCount" #trailing>
              <UBadge color="primary" variant="solid" size="sm" class="ms-auto tabular-nums">
                {{ item.badgeCount > 9 ? "9+" : item.badgeCount }}
              </UBadge>
            </template>
            <span
              v-if="collapsed && item.badgeCount"
              class="absolute end-1.5 top-1.5 size-2 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
          </UButton>

          <AppRailPinnedActions v-if="item.key === 'actions'" :collapsed="collapsed" />
        </template>
      </nav>
    </template>

    <template #footer="{ collapsed }">
      <UDropdownMenu
        :items="userMenuItems"
        :content="{ align: 'start' }"
        :class="collapsed ? 'mx-auto' : 'w-full min-w-0'"
      >
        <UButton
          color="neutral"
          variant="ghost"
          :square="collapsed"
          :block="!collapsed"
          class="press"
          :class="collapsed ? '' : 'min-w-0 justify-start'"
          :aria-label="t('shell.rail.profile')"
          :title="t('shell.rail.profile')"
        >
          <UAvatar :alt="displayName" size="sm" icon="i-tabler-user" />
          <template v-if="!collapsed">
            <span class="min-w-0 flex-1 truncate">{{ displayName }}</span>
            <UIcon name="i-tabler-chevron-down" class="size-4 shrink-0 text-dimmed" />
          </template>
        </UButton>
      </UDropdownMenu>
    </template>
  </UDashboardSidebar>
</template>

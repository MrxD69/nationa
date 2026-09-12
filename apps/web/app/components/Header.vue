<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";

const { t } = useI18n();
const route = useRoute();
const { user, isLoggedIn, signOut } = useAuth();

const items = computed<NavigationMenuItem[]>(() => [
  { label: t("common.nav.home"), to: "/", active: route.path === "/" },
  {
    label: t("common.nav.workspace"),
    to: "/companies",
    active: route.path.startsWith("/companies"),
  },
  { label: t("common.nav.assistant"), to: "/ai", active: route.path.startsWith("/ai") },
]);

const userMenuItems = computed<DropdownMenuItem[]>(() => [
  { type: "label", label: user.value?.email ?? t("common.user.guest") },
  { type: "separator" },
  {
    label: t("common.actions.profile"),
    icon: "i-tabler-user-circle",
    to: "/companies",
  },
  {
    label: t("common.actions.signOut"),
    icon: "i-tabler-logout",
    onSelect: () => signOut(),
  },
]);
</script>

<template>
  <UHeader class="bg-header animate-header-in backdrop-blur">
    <template #left>
      <NuxtLink to="/" class="flex min-w-0 items-center gap-2.5">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-inverted shadow-xs"
        >
          <UIcon name="i-tabler-building-bank" class="size-5" />
        </span>
        <span class="truncate text-base font-semibold tracking-tight text-highlighted">
          {{ $t("common.appName") }}
        </span>
      </NuxtLink>
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <LocaleSwitcher />
      <UColorModeButton />

      <UDropdownMenu v-if="isLoggedIn" :items="userMenuItems" :content="{ align: 'end' }">
        <UButton color="neutral" variant="ghost" square :aria-label="$t('common.actions.account')">
          <UAvatar :alt="user?.email ?? ''" size="2xs" icon="i-tabler-user" />
        </UButton>
      </UDropdownMenu>

      <UButton v-else to="/login" size="sm" :label="$t('common.actions.signIn')" />
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
    </template>
  </UHeader>
</template>

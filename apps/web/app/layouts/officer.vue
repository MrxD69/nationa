<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import { dirForLocale } from "~/constants/navigation";
import AppSidebarBrand from "~/components/shell/AppSidebarBrand.vue";
import OfficerAiPanel from "~/components/officer/OfficerAiPanel.vue";

type NavItem = { key: string; labelKey: string; icon: string; to: string };
type NavGroup = { key: string; labelKey: string; items: NavItem[] };

const { t, te, locale } = useI18n();
const route = useRoute();
const { agencies, agencyId, setAgency, ensureLoaded, agencyRole, isMinistryAgent } =
  useOfficerAgency();

const { signOut } = useAuth();
const { displayName, roleLabel: accountRoleLabel } = useUserIdentity();

const side = computed(() => (dirForLocale(locale.value) === "rtl" ? "right" : "left"));

const aiOpen = ref(false);

const baseGroups: NavGroup[] = [
  {
    key: "operations",
    labelKey: "officer.nav.groupOperations",
    items: [
      { key: "queue", labelKey: "officer.nav.queue", icon: "i-tabler-inbox", to: "/officer" },
      {
        key: "companies",
        labelKey: "officer.nav.companies",
        icon: "i-tabler-building-community",
        to: "/officer/companies",
      },
      {
        key: "team",
        labelKey: "officer.nav.team",
        icon: "i-tabler-users-group",
        to: "/officer/team",
      },
    ],
  },
  {
    key: "monitoring",
    labelKey: "officer.nav.groupMonitoring",
    items: [
      {
        key: "conditions",
        labelKey: "officer.nav.conditions",
        icon: "i-tabler-calendar-clock",
        to: "/officer/conditions",
      },
      {
        key: "registry",
        labelKey: "officer.nav.registry",
        icon: "i-tabler-shield-search",
        to: "/officer/registry",
      },
      {
        key: "analytics",
        labelKey: "officer.nav.analytics",
        icon: "i-tabler-chart-bar",
        to: "/officer/analytics",
      },
    ],
  },
  {
    key: "admin",
    labelKey: "officer.nav.groupAdmin",
    items: [
      {
        key: "agency",
        labelKey: "officer.nav.agency",
        icon: "i-tabler-building-bank",
        to: "/officer/agency",
      },
    ],
  },
];

// A plain `officer` lacks `officer.analytics.read` and `agency.manage`, so hide
// items that would only 403. `supervisor` / `admin` (ministry agent) see all.
const OFFICER_HIDDEN_KEYS = new Set(["analytics", "agency"]);

const groups = computed<NavGroup[]>(() => {
  const restricted = agencyRole.value === "officer";
  return baseGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !(restricted && OFFICER_HIDDEN_KEYS.has(item.key))),
    }))
    .filter((group) => group.items.length > 0);
});

function isActive(item: NavItem): boolean {
  return item.to === "/officer" ? route.path === "/officer" : route.path.startsWith(item.to);
}

const agencyItems = computed(() =>
  agencies.value.map((agency) => ({
    label: locale.value === "ar" ? agency.nameAr || agency.nameFr : agency.nameFr,
    value: agency.id,
  })),
);

const selectedAgency = computed<string | undefined>({
  get: () => agencyId.value ?? undefined,
  set: (value) => {
    if (value) {
      setAgency(value);
    }
  },
});

// Back-office identity: an agency role (agent/supervisor/admin) is more
// meaningful than the platform account type; ministry agents are labelled
// explicitly; otherwise fall back to the account type.
const roleLabel = computed(() => {
  if (isMinistryAgent.value) {
    return t("officer.common.ministryAgent");
  }
  const role = agencyRole.value;
  if (role) {
    const key = `officerTrust.agency.roleLabels.${role}`;
    return te(key) ? t(key) : role;
  }
  return accountRoleLabel.value;
});

const userMenuItems = computed<DropdownMenuItem[]>(() => [
  { type: "label", label: displayName.value, description: roleLabel.value },
  { type: "separator" },
  { label: t("common.actions.signOut"), icon: "i-tabler-logout", onSelect: () => signOut() },
]);

onMounted(() => {
  void ensureLoaded();
});
</script>

<template>
  <UDashboardGroup storage-key="nationa-officer" unit="rem">
    <UDashboardSidebar
      id="officer-rail"
      :side="side"
      :toggle-side="side"
      :menu="{ side, modal: false }"
      collapsible
      :default-size="17"
      :min-size="15"
      :max-size="22"
      :collapsed-size="4"
      :ui="{ root: 'nationa-sidebar', content: 'nationa-sidebar' }"
    >
      <template #header="{ collapsed }">
        <div class="flex w-full min-w-0 items-center gap-1">
          <AppSidebarBrand v-if="!collapsed" to="/officer" class="min-w-0 flex-1" />

          <div class="shrink-0" :class="collapsed ? 'mx-auto' : ''">
            <UDashboardSidebarCollapse :side="side" />
          </div>
        </div>
      </template>

      <template #default="{ collapsed }">
        <nav class="flex w-full flex-col gap-1.5">
          <template v-for="group in groups" :key="group.key">
            <span
              v-if="!collapsed"
              class="px-3 pb-1 pt-3 text-sm font-medium text-muted first:pt-0"
            >
              {{ t(group.labelKey) }}
            </span>

            <UButton
              v-for="item in group.items"
              :key="item.key"
              :to="item.to"
              block
              :square="collapsed"
              :label="collapsed ? undefined : t(item.labelKey)"
              :icon="item.icon"
              :title="t(item.labelKey)"
              :aria-label="t(item.labelKey)"
              active-color="primary"
              active-variant="soft"
              color="neutral"
              variant="ghost"
              size="xl"
              class="transition-colors"
              :class="[collapsed ? '' : 'justify-start', { 'is-active': isActive(item) }]"
              :active="isActive(item)"
              :aria-current="isActive(item) ? 'page' : undefined"
            />
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
            block
            :square="collapsed"
            class="press"
            :class="collapsed ? '' : 'min-w-0 justify-start'"
            :aria-label="t('shell.rail.profile')"
            :title="t('shell.rail.profile')"
          >
            <UAvatar :alt="displayName" size="sm" icon="i-tabler-user" />
            <template v-if="!collapsed">
              <span class="min-w-0 flex-1 text-left">
                <span class="block truncate text-sm font-medium">{{ displayName }}</span>
                <span class="block truncate text-xs text-muted">{{ roleLabel }}</span>
              </span>
              <UIcon name="i-tabler-chevron-down" class="size-4 shrink-0" />
            </template>
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="officer">
      <template #header>
        <UDashboardNavbar
          :title="$t('officer.title')"
          icon="i-tabler-clipboard-check"
          :toggle-side="side"
        >
          <template #right>
            <span
              v-if="isMinistryAgent && agencies.length > 1"
              class="hidden text-xs text-muted sm:inline"
            >
              {{ $t("officer.common.ministryScope") }}
            </span>

            <USelect
              v-if="agencies.length > 1"
              v-model="selectedAgency"
              :items="agencyItems"
              icon="i-tabler-building-bank"
              :title="isMinistryAgent ? $t('officer.common.ministryAgent') : undefined"
              :aria-label="
                isMinistryAgent ? $t('officer.common.organization') : $t('officer.common.agency')
              "
              class="w-40 sm:w-64"
            />

            <UButton
              color="neutral"
              variant="soft"
              size="md"
              icon="i-tabler-sparkles"
              :label="$t('officer.ai.open')"
              :aria-expanded="aiOpen"
              @click="aiOpen = !aiOpen"
            />

            <UColorModeButton />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="flex min-h-0 w-full flex-1 flex-col gap-6">
          <slot />
        </div>
      </template>
    </UDashboardPanel>

    <OfficerAiPanel v-model:open="aiOpen" />
  </UDashboardGroup>
</template>

import { computed } from "vue";
import type { ComputedRef } from "vue";

import { parseAccountType } from "@nationa/api/domain/account";

import { RAIL_ITEMS } from "~/constants/navigation";
import type { CompanySummary } from "~/composables/useSelectedCompany";
import type { RailItem } from "~/types/shell";

/**
 * Locale-aware display name for a company.
 */
function companyDisplayName(company: CompanySummary, isArabic: boolean): string {
  if (isArabic) {
    return company.legalNameAr || company.tradeName || company.legalName;
  }
  return company.tradeName || company.legalName;
}

/**
 * Rail items shaped for the signed-in user.
 *
 * An owner account represents a single company, so the `/companies` portfolio
 * entry is relabeled to that company and points straight at its overview. An
 * owner with no company keeps the item as an entry point to create/connect one.
 * Accountants/lawyers (multi-company) keep the "Entreprises" portfolio list.
 *
 * The list defaults to showing everything until the company list has loaded, so
 * SSR and the first client paint never disagree with the server.
 */
export function useVisibleRailItems(): ComputedRef<RailItem[]> {
  const client = useApi();
  const { user } = useAuth();
  const { companies, loaded, accessibleCompanyId } = useSelectedCompany();
  const { t, locale } = useI18n();
  const { catalogQuery } = useActions();

  // Reco count: client-side filter on the same `recommended` flag the API annotates. No new endpoint.
  const catalog = catalogQuery({ companyId: () => accessibleCompanyId.value ?? undefined });
  const recommendedCount = computed(() => {
    const items = catalog.data.value as Array<{ recommended?: boolean }> | undefined;
    if (!Array.isArray(items)) {
      return 0;
    }
    return items.filter((item) => item.recommended === true).length;
  });

  function withBadge(list: RailItem[]): RailItem[] {
    const companyId = accessibleCompanyId.value;
    const count = recommendedCount.value;
    return list.map((item) => {
      if (item.key !== "actions") {
        return item;
      }
      // Badge only when there is a company context and at least one reco; otherwise hidden.
      if (companyId && count > 0) {
        return { ...item, badgeCount: count };
      }
      return { ...item, badgeCount: undefined };
    });
  }

  const { data: session } = useAsyncData("session-account-type", () => client.session.get(), {
    lazy: true,
  });

  const accountType = computed(
    () =>
      parseAccountType(session.value?.accountType) ??
      parseAccountType(user.value?.user_metadata?.accountType) ??
      null,
  );

  return computed(() => {
    if (accountType.value !== "owner" || !loaded.value) {
      return withBadge(RAIL_ITEMS);
    }

    const isArabic = locale.value === "ar";
    const list = companies.value;

    const mapped = RAIL_ITEMS.map((item) => {
      if (item.key !== "companies") {
        return item;
      }

      if (list.length === 1) {
        const [company] = list;
        if (company) {
          return {
            ...item,
            to: `/companies/${company.id}`,
            label: companyDisplayName(company, isArabic) || t("shell.rail.myCompany"),
          };
        }
      }

      if (list.length === 0) {
        return { ...item, to: "/companies", label: t("shell.rail.myCompany") };
      }

      return item;
    });

    return withBadge(mapped);
  });
}

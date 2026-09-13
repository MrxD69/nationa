import { parseAccountType } from "@nationa/api/domain/account";

/**
 * Identity of the signed-in user for sidebar/profile chrome: display name,
 * email and a human-readable account-type (role) label.
 */
export function useUserIdentity() {
  const { user } = useAuth();
  const { t } = useI18n();

  const displayName = computed(() => {
    const value = user.value?.user_metadata?.displayName as string | undefined;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    return user.value?.email || t("common.user.guest");
  });

  const email = computed(() => user.value?.email ?? "");

  const accountType = computed(
    () => parseAccountType(user.value?.user_metadata?.accountType) ?? null,
  );

  const roleLabel = computed(() => t(`settings.account.types.${accountType.value ?? "unknown"}`));

  return { user, displayName, email, accountType, roleLabel };
}

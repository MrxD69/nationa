export function useAuth() {
  const client = useSupabaseClient();
  const user = useSupabaseUser();
  const session = useSupabaseSession();

  const isLoggedIn = computed(() => Boolean(user.value));

  function redirectToLogin(redirect?: string) {
    return navigateTo({
      path: "/login",
      query: redirect ? { redirect } : undefined,
    });
  }

  /**
   * Clear the per-user state we persist in cookies before dropping the session.
   * These cookies outlive a sign-in, so without this the next account to use this
   * browser inherits the previous one's selected company and pinned démarches.
   */
  function clearSessionScopedState() {
    useCookie("nationa:companyId", { path: "/" }).value = null;
    useCookie("nationa:open-actions", { path: "/" }).value = null;

    useState<string | null>("selected-company", () => null).value = null;
    useState<unknown[]>("selected-company-list", () => []).value = [];
    useState<boolean>("selected-company-initialized", () => false).value = false;
    useState<boolean>("selected-company-loaded", () => false).value = false;
    useState<unknown[]>("open-actions", () => []).value = [];
  }

  async function signOut() {
    clearSessionScopedState();
    await client.auth.signOut();
    return navigateTo("/login");
  }

  return {
    user,
    session,
    isLoggedIn,
    signOut,
    redirectToLogin,
  };
}

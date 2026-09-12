import type { Ref } from "vue";

const AI_PANEL_COOKIE_KEY = "nationa:ai-panel";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function useAssistantPanel(): {
  open: Ref<boolean>;
  toggle: () => void;
  setOpen: (v: boolean) => void;
} {
  const stored = useCookie<boolean | null>(AI_PANEL_COOKIE_KEY, {
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });
  const open = useState<boolean>("assistant-panel-open", () => stored.value ?? true);

  function persist(value: boolean) {
    if (import.meta.client) {
      stored.value = value;
    }
  }

  function toggle() {
    const next = !open.value;
    open.value = next;
    persist(next);
  }

  function setOpen(value: boolean) {
    open.value = value;
    persist(value);
  }

  return { open, toggle, setOpen };
}

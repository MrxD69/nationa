import type { Ref } from "vue";

const SHORTCUT_THROTTLE_MS = 100;
let lastShortcutAt = 0;

export function useCommandPalette(): {
  open: Ref<boolean>;
  toggle: () => void;
  setOpen: (v: boolean) => void;
} {
  const open = useState<boolean>("command-palette-open", () => false);

  function toggle() {
    open.value = !open.value;
  }

  function setOpen(value: boolean) {
    open.value = value;
  }

  if (import.meta.client && getCurrentInstance()) {
    defineShortcuts({
      meta_k: () => {
        const now = Date.now();
        if (now - lastShortcutAt < SHORTCUT_THROTTLE_MS) {
          return;
        }
        lastShortcutAt = now;
        toggle();
      },
    });
  }

  return { open, toggle, setOpen };
}

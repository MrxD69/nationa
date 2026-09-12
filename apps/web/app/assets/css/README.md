# Nationa design system

Public-sector, **white-first** aesthetic: mostly white surfaces, subtle slate
borders, an institutional blue accent, near-black text, and restrained GSAP
motion. Light mode is the default; dark mode is fully supported but secondary.

## Color system

Colors are wired in two places:

1. `app.config.ts` maps the semantic Nuxt UI color aliases:
   - `primary: 'brand'` — the custom blue ramp below.
   - `neutral: 'slate'` — Tailwind's slate, used for every surface/border/text.
2. `main.css` defines the `brand` ramp and the semantic `--ui-*` tokens.

### Brand ramp (blue, 50 → 950)

Declared with `@theme static` so the variables are always emitted:

| Token               | Value     | Typical use                          |
| ------------------- | --------- | ------------------------------------ |
| `--color-brand-50`  | `#f0f5ff` | tinted backgrounds, subtle fills     |
| `--color-brand-100` | `#dbe7fe` | selection, ghost fills               |
| `--color-brand-200` | `#bfd4fe` | dividers on brand surfaces           |
| `--color-brand-300` | `#93b4fd` | borders / disabled brand             |
| `--color-brand-400` | `#6090fa` | **dark-mode primary**                |
| `--color-brand-500` | `#3b6df5` | focus ring color                     |
| `--color-brand-600` | `#2456e6` | **light-mode primary** (AA on white) |
| `--color-brand-700` | `#1c44c4` | hover / pressed                      |
| `--color-brand-800` | `#1c3b9e` | —                                    |
| `--color-brand-900` | `#1c357d` | text on brand tints                  |
| `--color-brand-950` | `#142350` | deep accents                         |

`--ui-primary` is overridden to `--ui-color-primary-600` in light mode and
`--ui-color-primary-400` in dark mode.

### Semantic tokens (light is default)

| Token                   | Light       | Dark        |
| ----------------------- | ----------- | ----------- |
| `--ui-bg`               | `#ffffff`   | `slate-950` |
| `--ui-bg-muted`         | `slate-50`  | `slate-900` |
| `--ui-bg-elevated`      | `#ffffff`   | `slate-900` |
| `--ui-bg-accented`      | `slate-100` | `slate-800` |
| `--ui-bg-inverted`      | `slate-900` | `#ffffff`   |
| `--ui-text-dimmed`      | `slate-400` | `slate-600` |
| `--ui-text-muted`       | `slate-500` | `slate-400` |
| `--ui-text-toned`       | `slate-600` | `slate-300` |
| `--ui-text`             | `slate-700` | `slate-200` |
| `--ui-text-highlighted` | `slate-900` | `#ffffff`   |
| `--ui-text-inverted`    | `#ffffff`   | `slate-950` |
| `--ui-border`           | `slate-200` | `slate-800` |
| `--ui-border-muted`     | `slate-100` | `slate-800` |
| `--ui-border-accented`  | `slate-300` | `slate-700` |
| `--ui-primary`          | `brand-600` | `brand-400` |
| `--ui-radius`           | `0.625rem`  | —           |

App-level helpers (not part of Nuxt UI) available to shells:

- `--nationa-surface`, `--nationa-surface-subtle`
- `--nationa-header-bg` (translucent header)
- `--nationa-shadow-xs` / `-sm` / `-md`
- `--nationa-focus-ring`

Utility classes: `bg-header` (translucent header backdrop), `animate-header-in`
(CSS mount animation for the header, disabled under reduced motion).

Focus rings fall back to `--ui-color-primary-500`; component utilities still win.

## White-first color mode

`nuxt.config.ts` sets:

```ts
colorMode: { preference: "light", fallback: "light", classSuffix: "" }
```

The `UColorModeButton` toggle stays usable; users may still opt into dark.

## Animations

GSAP is provided by `plugins/gsap.client.ts` as `$gsap` / `$scrollTrigger`
(ScrollTrigger registered, `power2.out` defaults).

### `useAnimation()`

Auto-imported composable. Every helper is a **no-op** (final state applied
immediately) when `prefers-reduced-motion: reduce` is set or GSAP is unavailable
(SSR). Returns:

| Member                               | Description                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `revealIn(target, opts)`             | fade + rise into view (`y` default `16`)                                              |
| `fadeIn(target, opts)`               | opacity-only fade                                                                     |
| `slideIn(target, opts)`              | direction-aware slide; logical `inline-start` / `inline-end` flip under RTL           |
| `staggerChildren(target, opts)`      | fade + rise children (`selector` defaults to `[role='listitem'], [data-reveal-item]`) |
| `progressCount(target, value, opts)` | tween a number into `textContent` (`format` callback optional)                        |
| `progressBar(target, value, opts)`   | tween `scaleX`; `transformOrigin` is RTL-aware                                        |
| `to` / `from`                        | thin wrappers with shared defaults                                                    |
| `enabled`, `reducedMotion`           | reactive state                                                                        |
| `gsap`, `ScrollTrigger`              | direct access                                                                         |

All helpers accept `{ duration, delay, ease }` and target a selector, an
element, `Element[]`, or a `Ref`.

### `v-reveal` directive

Registered by `plugins/reveal.ts` (available during SSR so there is no
"unknown directive" warning; it only acts on the client).

```html
<div v-reveal>…</div>
<div v-reveal="{ y: 12, duration: 0.4 }">…</div>
<div v-reveal="{ direction: 'inline-start', distance: 24 }">…</div>
<div v-reveal="{ scroll: true, start: 'top 85%' }">…</div>
<!-- ScrollTrigger, once -->
<div v-reveal.stagger="{ selector: '[role=listitem]' }">…</div>
```

- Value may be a preset string (`up`, `down`, `left`, `right`, `start`, `end`,
  `fade`, `scale`) or an options object.
- Modifiers: `.stagger` (animate matching children with a 50 ms stagger) and
  `.scroll` (play on enter via ScrollTrigger, `once`).
- Logical directions (`start` / `end` / `inline-start` / `inline-end`) are
  resolved from the element's computed `direction`, so RTL behaves correctly.
- Unmounted tweens are killed to avoid leaks.

"Sidebar category expand" uses Nuxt UI's built-in `collapsible-down` /
`collapsible-up` keyframes, which already respect reduced motion.

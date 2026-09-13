# Nationa design system

Public-sector, **white-first** aesthetic: mostly white surfaces, neutral zinc
borders, an institutional blue accent, near-black text, and restrained GSAP
motion. Light mode is the default; dark mode is fully supported but secondary.
Dark mode is built on neutral zinc (not blue-tinted slate); blue is reserved for
the accent only.

## Color system

Colors are wired in two places:

1. `app.config.ts` maps the semantic Nuxt UI color aliases:
   - `primary: 'brand'` — the custom blue ramp below.
   - `neutral: 'zinc'` — Tailwind's zinc (neutral, not blue-tinted), used for
     every surface/border/text.
2. `main.css` defines the `brand` ramp and the semantic `--ui-*` tokens.

### Brand ramp (blue, 50 → 950)

Declared with `@theme static` so the variables are always emitted:

| Token               | Value     | Typical use                          |
| ------------------- | --------- | ------------------------------------ |
| `--color-brand-50`  | `#eff4ff` | tinted backgrounds, subtle fills     |
| `--color-brand-100` | `#dde7fd` | selection, ghost fills               |
| `--color-brand-200` | `#c2d3fb` | dividers on brand surfaces           |
| `--color-brand-300` | `#98b3f7` | borders / disabled brand             |
| `--color-brand-400` | `#6b8ef0` | dark focus ring                      |
| `--color-brand-500` | `#4a6ee0` | **dark-mode primary**                |
| `--color-brand-600` | `#3353c4` | **light-mode primary** (AA on white) |
| `--color-brand-700` | `#2a44a0` | hover / pressed                      |
| `--color-brand-800` | `#273b81` | —                                    |
| `--color-brand-900` | `#253467` | text on brand tints                  |
| `--color-brand-950` | `#161e3d` | deep accents                         |

`--ui-primary` is overridden to `--ui-color-primary-600` in light mode and
`--ui-color-primary-500` in dark mode.

### Semantic tokens (light is default)

| Token                   | Light       | Dark        |
| ----------------------- | ----------- | ----------- |
| `--ui-bg`               | `#ffffff`   | `zinc-950`  |
| `--ui-bg-muted`         | `zinc-50`   | `zinc-900`  |
| `--ui-bg-elevated`      | `#ffffff`   | `zinc-900`  |
| `--ui-bg-accented`      | `zinc-100`  | `zinc-800`  |
| `--ui-bg-inverted`      | `zinc-900`  | `#ffffff`   |
| `--ui-text-dimmed`      | `zinc-500`  | `zinc-500`  |
| `--ui-text-muted`       | `zinc-600`  | `zinc-300`  |
| `--ui-text-toned`       | `zinc-700`  | `zinc-200`  |
| `--ui-text`             | `zinc-800`  | `zinc-100`  |
| `--ui-text-highlighted` | `zinc-900`  | `#ffffff`   |
| `--ui-text-inverted`    | `#ffffff`   | `zinc-950`  |
| `--ui-border`           | `zinc-300`  | `zinc-700`  |
| `--ui-border-muted`     | `zinc-200`  | `zinc-800`  |
| `--ui-border-accented`  | `zinc-400`  | `zinc-600`  |
| `--ui-primary`          | `brand-600` | `brand-500` |
| `--ui-radius`           | `0.375rem`  | —           |
| `--nationa-hover`       | `zinc-100`  | `zinc-800`  |

> **Surface fix (T1).** `--ui-bg-elevated` intentionally equals `--ui-bg` in
> light mode (both `#ffffff`) because it marks a true elevated card surface.
> `hover:bg-elevated` is therefore invisible on a white page — use
> `.hover-surface` (or `hover:bg-accented`) for row/list hovers instead. In dark
> mode `--ui-bg-elevated` (`zinc-900`) is visibly distinct from the page
> (`zinc-950`). `--nationa-hover` is the canonical visible hover fill in both
> modes.

App-level helpers (not part of Nuxt UI) available to shells:

- `--nationa-surface`, `--nationa-surface-subtle`
- `--nationa-header-bg` (translucent header)
- `--nationa-hover` (canonical row/list hover fill, both modes)
- `--nationa-shadow-xs` / `-sm` / `-md`
- `--nationa-shadow-card` (layered card elevation), `--nationa-shadow-pop`
  (floating/popover elevation)
- `--nationa-ring-hairline` (`0 0 0 1px` low-opacity ring for bordered surfaces)
- `--nationa-focus-ring`

## Motion tokens

Declared on `:root, .light` and inherited by `.dark`:

| Token             | Value                             |
| ----------------- | --------------------------------- |
| `--ease-out`      | `cubic-bezier(0.23, 1, 0.32, 1)`  |
| `--ease-in-out`   | `cubic-bezier(0.77, 0, 0.175, 1)` |
| `--ease-drawer`   | `cubic-bezier(0.32, 0.72, 0, 1)`  |
| `--duration-fast` | `120ms`                           |
| `--duration-base` | `180ms`                           |
| `--duration-slow` | `260ms`                           |

Enter animations use `--ease-out`; on-screen movement uses `--ease-in-out`;
drawers/sheets use `--ease-drawer`. Keep UI transitions under 300 ms and always
name the exact properties — **never `transition: all`**.

## Radius scale

One scale, applied concentrically (`inner radius = outer radius − padding`):

| Surface                                       | Class        | Value                      |
| --------------------------------------------- | ------------ | -------------------------- |
| Outer panels / cards                          | `rounded-lg` | `0.5rem`                   |
| Inner controls / inputs / rows / card-in-card | `rounded-md` | `0.375rem` (`--ui-radius`) |
| Chips / badges / icon squares                 | `rounded-md` | `0.375rem`                 |

The base `--ui-radius` is `0.375rem` — the mid-point between Nuxt UI's crisp
`0.25rem` and the `0.5rem` panels. Corners stay comfortably rounded: panels and
cards sit at `rounded-lg` (0.5rem), and everything nested inside them — inner
controls, inputs, list rows and chips — uses `rounded-md` (0.375rem) so the radii
stay concentric (`inner = outer − padding`).

Prefer one surface per object: sections inside a surface use `divide-y
divide-default` instead of nesting another bordered card.

## Utility classes

Defined in `main.css` (`@layer utilities`):

| Class                 | Purpose                                                                        |
| --------------------- | ------------------------------------------------------------------------------ |
| `.transition-control` | named color/bg/border/shadow/transform/opacity transition at `--duration-base` |
| `.transition-press`   | transform-only transition at `--duration-fast`                                 |
| `.press`              | `:active { transform: scale(0.96) }` press feedback                            |
| `.hover-surface`      | visible hover fill via `--nationa-hover` (fine pointers only)                  |
| `.hover-lift`         | `translateY(-2px)` + pop shadow on hover (fine pointers only)                  |
| `.reveal-on-hover`    | hidden until parent `.group:hover` or `:focus-visible` (touch-safe: visible)   |
| `.shadow-card`        | `box-shadow: var(--nationa-shadow-card)`                                       |
| `.img-outline`        | 1px low-opacity outline for images (black light / white dark)                  |
| `.page-title`         | `1.5rem` → `1.875rem` at `sm`, semibold, tight tracking, highlighted           |
| `.page-subtitle`      | `1rem` muted, capped at `65ch`                                                 |
| `.tabular`            | `font-variant-numeric: tabular-nums` for figures                               |
| `bg-header`           | translucent fixed-header backdrop                                              |
| `animate-header-in`   | one-shot header mount animation                                                |

Hover movement utilities (`.hover-lift`, `.hover-surface`, `.reveal-on-hover`)
are gated behind `@media (hover: hover) and (pointer: fine)` so touch taps do
not trigger false hovers.

Focus is global (`@layer base`): `:focus-visible` renders a `2px` primary
outline with `2px` offset. Suppressing it requires an explicit
`focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` drops all movement: `.press:active`
and `.hover-lift` transforms are neutralised and `animate-header-in` is
disabled. Color/opacity transitions are kept because they aid comprehension.

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
- **Failsafe.** For `.scroll`, a 2.5 s safety timer forces the tween to its end
  state (`progress(1)` + `ScrollTrigger.refresh()`) so content is never
  permanently hidden if the trigger never fires (e.g. an unmeasured or hidden
  container). Mounting is wrapped in `try/catch` and falls back to
  `gsap.set(el, { clearProps: "all" })` so a GSAP failure leaves content fully
  visible. `unmounted` clears the timer, kills the trigger/tween, and clears
  inline props.
- `ScrollTrigger.config({ ignoreMobileResize: true })` avoids refresh churn
  from mobile browser chrome resizing.
- Under `prefers-reduced-motion: reduce` the directive returns early and leaves
  the element visible with no movement.

"Sidebar category expand" uses Nuxt UI's built-in `collapsible-down` /
`collapsible-up` keyframes, which already respect reduced motion.

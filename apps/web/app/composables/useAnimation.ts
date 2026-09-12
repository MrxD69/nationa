import type { gsap } from "gsap";

type Gsap = typeof gsap;
type TweenTarget = Parameters<Gsap["to"]>[0];
type TweenVars = Parameters<Gsap["to"]>[1];

const DEFAULT_EASE = "power2.out";
const DEFAULT_DURATION = 0.5;

export interface AnimationOptions {
  duration?: number;
  delay?: number;
  ease?: string;
  once?: boolean;
}

export interface RevealOptions extends AnimationOptions {
  /** Vertical offset in px. Defaults to 16. */
  y?: number;
  /** Horizontal offset in px. */
  x?: number;
  /** Starting opacity. Defaults to 0. */
  opacity?: number;
}

export interface StaggerOptions extends AnimationOptions {
  /** Distance for the rise, defaults to 12. */
  y?: number;
  /** Gap between each child, defaults to 0.05. */
  stagger?: number;
  /** Override the default child query. */
  selector?: string;
  /** Starting opacity. Defaults to 0. */
  opacity?: number;
}

export interface DirectionOptions extends AnimationOptions {
  /** Physical or logical direction. Logical values flip under RTL. */
  direction?: "up" | "down" | "left" | "right" | "inline-start" | "inline-end";
  /** Travel distance in px. Defaults to 24. */
  distance?: number;
  opacity?: number;
}

export interface ProgressCountOptions extends AnimationOptions {
  from?: number;
  /** Text formatter; defaults to a rounded locale string. */
  format?: (value: number) => string;
}

export type Direction = NonNullable<DirectionOptions["direction"]>;

function toElements(target: TweenTarget): Element[] {
  if (typeof target === "string") {
    return typeof document === "undefined" ? [] : Array.from(document.querySelectorAll(target));
  }
  if (target instanceof Element) return [target];
  if (Array.isArray(target))
    return target.filter((item): item is Element => item instanceof Element);
  if (target && typeof target === "object" && "value" in target) {
    return toElements((target as { value: TweenTarget }).value);
  }
  return [];
}

/** True when the user asked the OS/browser to reduce motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** True when the nearest writing direction is right-to-left. */
export function isRtl(element?: Element | null): boolean {
  if (typeof window === "undefined") return false;
  return getComputedStyle(element ?? document.documentElement).direction === "rtl";
}

/** Resolve a direction-aware `{ x, y }` transform offset. */
export function resolveDirection(
  direction: Direction,
  distance: number,
  element?: Element | null,
): { x: number; y: number } {
  const rtl = isRtl(element);
  switch (direction) {
    case "up":
      return { x: 0, y: distance };
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: -distance, y: 0 };
    case "right":
      return { x: distance, y: 0 };
    case "inline-start":
      return { x: rtl ? distance : -distance, y: 0 };
    case "inline-end":
      return { x: rtl ? -distance : distance, y: 0 };
  }
}

/**
 * Tasteful, non-blocking GSAP helpers for the Nationa shells.
 * No-ops when GSAP is unavailable (SSR) or prefers-reduced-motion is set.
 */
export function useAnimation() {
  const nuxt = useNuxtApp();
  const gsapInstance = nuxt.$gsap;
  const reduced = ref(prefersReducedMotion());

  if (import.meta.client) {
    onMounted(() => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      reduced.value = mq.matches;
      const onChange = () => {
        reduced.value = mq.matches;
      };
      mq.addEventListener?.("change", onChange);
      onScopeDispose(() => mq.removeEventListener?.("change", onChange));
    });
  }

  const enabled = computed(() => Boolean(gsapInstance) && !reduced.value);

  function to(target: TweenTarget, vars: TweenVars = {}) {
    if (!gsapInstance || reduced.value) return null;
    return gsapInstance.to(target, { duration: DEFAULT_DURATION, ease: DEFAULT_EASE, ...vars });
  }

  function from(target: TweenTarget, vars: TweenVars = {}) {
    if (!gsapInstance || reduced.value) return null;
    return gsapInstance.from(target, {
      duration: DEFAULT_DURATION,
      ease: DEFAULT_EASE,
      clearProps: "transform,opacity,visibility",
      ...vars,
    });
  }

  /** Fade + rise into view. */
  function revealIn(target: TweenTarget, options: RevealOptions = {}) {
    return from(target, {
      autoAlpha: options.opacity ?? 0,
      y: options.y ?? 16,
      x: options.x ?? 0,
      duration: options.duration ?? 0.55,
      delay: options.delay ?? 0,
      ease: options.ease ?? DEFAULT_EASE,
    });
  }

  /** Opacity-only fade in. */
  function fadeIn(target: TweenTarget, options: AnimationOptions & { opacity?: number } = {}) {
    return from(target, {
      autoAlpha: options.opacity ?? 0,
      duration: options.duration ?? 0.4,
      delay: options.delay ?? 0,
      ease: options.ease ?? DEFAULT_EASE,
    });
  }

  /** Direction-aware slide-in (logical directions respect RTL). */
  function slideIn(target: TweenTarget, options: DirectionOptions = {}) {
    const elements = toElements(target);
    const first = elements[0];
    const { x, y } = resolveDirection(
      options.direction ?? "inline-start",
      options.distance ?? 24,
      first,
    );
    return from(target, {
      autoAlpha: options.opacity ?? 0,
      x,
      y,
      duration: options.duration ?? 0.5,
      delay: options.delay ?? 0,
      ease: options.ease ?? DEFAULT_EASE,
    });
  }

  /** Fade + rise the children of a container, one after another. */
  function staggerChildren(target: TweenTarget, options: StaggerOptions = {}) {
    const roots = toElements(target);
    const selector = options.selector ?? "[role='listitem'], [data-reveal-item]";
    const children = roots.flatMap((root) => {
      const matches = Array.from(root.querySelectorAll(selector));
      return matches.length ? matches : Array.from(root.children);
    });
    if (!children.length) return null;
    return from(children, {
      autoAlpha: options.opacity ?? 0,
      y: options.y ?? 12,
      duration: options.duration ?? 0.45,
      delay: options.delay ?? 0,
      stagger: options.stagger ?? 0.05,
      ease: options.ease ?? DEFAULT_EASE,
    });
  }

  /** Tween a numeric value into an element's text content. */
  function progressCount(target: TweenTarget, value: number, options: ProgressCountOptions = {}) {
    const formats = options.format ?? ((current: number) => Math.round(current).toLocaleString());
    if (!gsapInstance || reduced.value) {
      toElements(target).forEach((el) => {
        el.textContent = formats(value);
      });
      return null;
    }
    const counter = { value: options.from ?? 0 };
    return gsapInstance.to(counter, {
      value,
      duration: options.duration ?? 0.9,
      delay: options.delay ?? 0,
      ease: options.ease ?? DEFAULT_EASE,
      onUpdate: () => {
        toElements(target).forEach((el) => {
          el.textContent = formats(counter.value);
        });
      },
    });
  }

  /** Tween a progress bar's fill (scaleX), direction-aware. */
  function progressBar(
    target: TweenTarget,
    value: number,
    options: AnimationOptions & { origin?: string } = {},
  ) {
    const first = toElements(target)[0];
    return to(target, {
      scaleX: value,
      transformOrigin: options.origin ?? (isRtl(first) ? "right center" : "left center"),
      duration: options.duration ?? 0.8,
      delay: options.delay ?? 0,
      ease: options.ease ?? "power2.out",
    });
  }

  return {
    gsap: gsapInstance,
    ScrollTrigger: nuxt.$scrollTrigger,
    enabled,
    reducedMotion: readonly(reduced),
    revealIn,
    fadeIn,
    slideIn,
    staggerChildren,
    progressCount,
    progressBar,
    to,
    from,
  };
}

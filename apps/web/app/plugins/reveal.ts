import type { DirectiveBinding } from "vue";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, resolveDirection, type Direction } from "~/composables/useAnimation";

type RevealPreset = "up" | "down" | "left" | "right" | "start" | "end" | "fade" | "scale";

interface RevealConfig {
  y?: number;
  x?: number;
  opacity?: number;
  scale?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  direction?: Direction;
  distance?: number;
  selector?: string;
  scroll?: boolean;
  start?: string;
}

type RevealValue = RevealPreset | RevealConfig;
type GsapFrom = typeof gsap.from;

const PRESET_DIRECTIONS: Record<RevealPreset, Direction> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  start: "inline-start",
  end: "inline-end",
  fade: "up",
  scale: "up",
};

function resolveConfig(el: HTMLElement, binding: DirectiveBinding<RevealValue>) {
  const value = binding.value;
  const config: RevealConfig = value && typeof value === "object" ? value : {};
  const preset: RevealPreset = typeof value === "string" ? value : "up";
  const distance = config.distance ?? 16;

  let x = config.x;
  let y = config.y;
  if (x === undefined && y === undefined && preset !== "fade" && preset !== "scale") {
    const offset = resolveDirection(config.direction ?? PRESET_DIRECTIONS[preset], distance, el);
    x = offset.x;
    y = offset.y;
  }

  const scale = preset === "scale" ? (config.scale ?? 0.98) : config.scale;
  const candidates = binding.modifiers.stagger
    ? Array.from(el.querySelectorAll(config.selector ?? "[role='listitem'], [data-reveal-item]"))
    : [];
  const targets = (candidates.length ? candidates : el) as unknown as Parameters<GsapFrom>[0];

  return {
    scroll: config.scroll ?? Boolean(binding.modifiers.scroll),
    start: config.start ?? "top 85%",
    targets,
    vars: {
      autoAlpha: config.opacity ?? 0,
      duration: config.duration ?? 0.55,
      delay: config.delay ?? 0,
      ease: config.ease ?? "power2.out",
      clearProps: "transform,opacity,visibility",
      ...(x ? { x } : {}),
      ...(y ? { y } : {}),
      ...(scale ? { scale } : {}),
      ...(binding.modifiers.stagger ? { stagger: 0.05 } : {}),
    } as Parameters<GsapFrom>[1],
  };
}

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.client) {
    gsap.registerPlugin(ScrollTrigger);
  }

  const tweens = new WeakMap<
    HTMLElement,
    { kill: () => void; scrollTrigger?: { kill: () => void } }
  >();

  nuxtApp.vueApp.directive<HTMLElement, RevealValue>("reveal", {
    mounted: (el, binding) => {
      if (!import.meta.client || prefersReducedMotion()) return;

      const { vars, targets, scroll, start } = resolveConfig(el, binding);
      const tween = scroll
        ? gsap.from(targets, {
            ...vars,
            scrollTrigger: { trigger: el, start, once: true },
          } as Parameters<GsapFrom>[1])
        : gsap.from(targets, vars);

      tweens.set(el, tween);
    },
    unmounted: (el) => {
      const tween = tweens.get(el);
      tween?.scrollTrigger?.kill();
      tween?.kill();
      tweens.delete(el);
    },
  });
});

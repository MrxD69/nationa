import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power2.out", duration: 0.5 });

  return {
    provide: {
      gsap,
      scrollTrigger: ScrollTrigger,
    },
  };
});

declare module "#app" {
  interface NuxtApp {
    $gsap: typeof gsap;
    $scrollTrigger: typeof ScrollTrigger;
  }
}

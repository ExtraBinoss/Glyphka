import { animate, mix } from "motion/react";
import { createPathMorph } from "@/engine/morph";
import { INTRO_LETTERS, type IntroFrame } from "./brand-glyphs";
import { recordPerformance } from "./performance";

const matrices = new Map<string, number[]>();
function transformMatrix(value = "") {
  let matrix = matrices.get(value);
  if (!matrix) {
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "g");
    probe.setAttribute("transform", value);
    const m = probe.transform.baseVal.consolidate()?.matrix;
    matrix = m ? [m.a, m.b, m.c, m.d, m.e, m.f] : [1, 0, 0, 1, 0, 0];
    matrices.set(value, matrix);
  }
  return matrix;
}

function glyphTransition(
  element: HTMLElement,
  from: IntroFrame,
  to: IntroFrame,
) {
  const tracks = [false, true].flatMap((cutout) => {
    const previous = from.marks.filter((mark) => !!mark.cutout === cutout);
    const next = to.marks.filter((mark) => !!mark.cutout === cutout);
    const nodes = [
      ...element.querySelectorAll<SVGPathElement>(
        cutout ? "[data-intro-cut]" : "[data-intro-ink]",
      ),
    ];
    return nodes.map((node, index) => {
      const a = previous[index],
        b = next[index],
        reference = b ?? a;
      const path = createPathMorph(a?.d ?? "", b?.d ?? "");
      const transform = mix(
        transformMatrix(a?.transform),
        transformMatrix(b?.transform),
      );
      node.setAttribute(
        "fill",
        reference?.stroke ? "none" : cutout ? "black" : "currentColor",
      );
      node.setAttribute(
        "stroke",
        reference?.stroke ? (cutout ? "black" : "currentColor") : "none",
      );
      node.setAttribute("stroke-linecap", to.roundness > 45 ? "round" : "butt");
      node.setAttribute(
        "stroke-linejoin",
        to.roundness > 45 ? "round" : "miter",
      );
      return (progress: number) => {
        node.setAttribute("d", path(progress));
        node.setAttribute(
          "transform",
          `matrix(${transform(progress).join(" ")})`,
        );
        node.setAttribute(
          "stroke-width",
          String(mix(a?.stroke ?? 0, b?.stroke ?? 0, progress)),
        );
        node.setAttribute(
          "opacity",
          String(!a ? progress : !b ? 1 - progress : 1),
        );
      };
    });
  });
  return animate(0, 1, {
    duration: 0.12,
    ease: [0.4, 0, 0.2, 1],
    onUpdate: (progress) => {
      for (const update of tracks) update(progress);
    },
  });
}

export function startIntro(
  stage: HTMLElement,
  studio: HTMLElement,
  onComplete: () => void,
) {
  const root = document.documentElement;
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const heading = studio.querySelector<HTMLElement>(".word-logo")!;
  const original = {
    inert: studio.inert,
    opacity: studio.style.opacity,
    transform: studio.style.transform,
    headingVisibility: heading.style.visibility,
  };
  const controls: { stop: () => void }[] = [];
  const timers = new Map<number, () => void>();
  let cancelled = false,
    completed = false;
  const active = () => !cancelled && !completed;
  const restore = () => {
    studio.inert = original.inert;
    studio.style.opacity = original.opacity;
    studio.style.transform = original.transform;
    heading.style.visibility = original.headingVisibility;
  };
  const stop = () => {
    for (const control of controls) control.stop();
    for (const [timer, resolve] of timers) {
      clearTimeout(timer);
      resolve();
    }
    timers.clear();
  };
  const wait = (duration: number) =>
    new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, duration);
      timers.set(timer, resolve);
    });
  const complete = () => {
    if (!active()) return;
    completed = true;
    const restoreFocus = stage.contains(document.activeElement);
    stop();
    delete root.dataset.glyphkaIntro;
    restore();
    onComplete();
    if (restoreFocus)
      studio
        .querySelector<HTMLButtonElement>("nav button")
        ?.focus({ preventScroll: true });
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      complete();
    }
  };
  const onPreference = () => {
    if (media.matches) complete();
  };
  studio.inert = true;
  // Prime the studio underneath the opaque veil, before the final reveal.
  studio.style.opacity = "1";
  heading.style.visibility = "hidden";
  window.addEventListener("keydown", onKey);
  media.addEventListener("change", onPreference);
  const watchdog = window.setTimeout(complete, 4500);
  const play = async () => {
    // Let hydration and preference restoration finish before moving any paths.
    await new Promise<void>((resolve) => {
      let remaining = 4;
      const painted = () => {
        if (--remaining) frame = requestAnimationFrame(painted);
        else resolve();
      };
      let frame = requestAnimationFrame(painted);
      controls.push({
        stop: () => {
          cancelAnimationFrame(frame);
          resolve();
        },
      });
    });
    if (!active()) return;
    root.dataset.glyphkaIntro = "playing";
    const started = performance.now();
    const elements = [
      ...stage.querySelectorAll<HTMLElement>(".startup-letter"),
    ];
    await Promise.all(
      INTRO_LETTERS.map(async (letter, index) => {
        await wait(index * 100);
        if (!active()) return;
        const element = elements[index];
        element.dataset.animating = "true";
        const highlight = animate(element, { opacity: 1 }, { duration: 0.06 });
        controls.push(highlight);
        await wait(60);
        if (!active()) return;
        for (let frame = 1; frame < letter.frames.length; frame++) {
          const morph = glyphTransition(
            element,
            letter.frames[frame - 1],
            letter.frames[frame],
          );
          controls.push(morph);
          await morph;
          if (!active()) return;
          await wait(140);
          if (!active()) return;
        }
        delete element.dataset.animating;
        element.dataset.settled = "true";
      }),
    );
    if (!active()) return;
    root.dataset.glyphkaIntro = "settled";
    const word = stage.querySelector<HTMLElement>(".startup-word")!;
    const veil = stage.querySelector<HTMLElement>(".startup-veil")!;
    const finishColor = animate(
      word,
      { color: getComputedStyle(heading.querySelector(".brand-word")!).color },
      { duration: 0.16 },
    );
    controls.push(finishColor);
    await finishColor;
    if (!active()) return;
    const source = word.getBoundingClientRect(),
      target = heading
        .querySelector<HTMLElement>(".brand-word")!
        .getBoundingClientRect();
    root.dataset.glyphkaIntro = "docking";
    const landing = [
      animate(
        word,
        {
          x: target.x + target.width / 2 - source.x - source.width / 2,
          y: target.y + target.height / 2 - source.y - source.height / 2,
          scale: target.width / source.width,
        },
        { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
      ),
      animate(veil, { opacity: 0 }, { duration: 0.5, delay: 0.12 }),
      animate(
        stage.querySelector<HTMLElement>(".startup-skip")!,
        { opacity: 0 },
        { duration: 0.15 },
      ),
    ];
    controls.push(...landing);
    await Promise.all(landing);
    if (!active()) return;
    recordPerformance("intro:duration", started);
    complete();
  };
  if (media.matches) queueMicrotask(complete);
  else void play().catch(complete);
  return {
    skip: complete,
    dispose: () => {
      cancelled = true;
      clearTimeout(watchdog);
      stop();
      restore();
      window.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onPreference);
      if (!completed && root.hasAttribute("data-glyphka-intro"))
        root.dataset.glyphkaIntro = "pending";
    },
  };
}

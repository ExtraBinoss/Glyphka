import { frame, cancelFrame, mix } from "motion/react";
import { createPathMorph } from "@/engine/morph";
import { recordPerformance } from "./performance";

type Attributes = Record<string, string | number>;
type Track = {
  start: number;
  duration: number;
  targets: Attributes;
  mixers: [string, (progress: number) => string | number][];
};
const tracks = new Map<SVGElement, Track>();
let running = false;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
function tick({ timestamp }: { timestamp: number }) {
  const start = performance.now();
  for (const [element, track] of tracks) {
    if (!element.isConnected) {
      tracks.delete(element);
      continue;
    }
    const progress = Math.min(
      1,
      Math.max(0, (timestamp - track.start) / track.duration),
    );
    for (const [name, interpolate] of track.mixers)
      element.setAttribute(
        name,
        String(
          progress === 1 ? track.targets[name] : interpolate(ease(progress)),
        ),
      );
    if (progress === 1) {
      tracks.delete(element);
      delete element.dataset.morphing;
    }
  }
  if (!tracks.size) {
    running = false;
    cancelFrame(tick);
  }
  recordPerformance("svg:morph-frame", start);
}
export function cancelMorph(element: SVGElement) {
  tracks.delete(element);
  delete element.dataset.morphing;
}
export function morphAttributes(
  element: SVGElement,
  targets: Attributes,
  instant = false,
) {
  const start = performance.now();
  cancelMorph(element);
  const mixers: Track["mixers"] = [];
  for (const [name, target] of Object.entries(targets)) {
    const previous = element.getAttribute(name);
    if (previous === String(target)) continue;
    if (instant || previous === null || previous === "" || target === "") {
      element.setAttribute(name, String(target));
      continue;
    }
    mixers.push([
      name,
      name === "d"
        ? createPathMorph(previous, String(target))
        : mix(previous, String(target)),
    ]);
  }
  recordPerformance("svg:morph-prepare", start);
  if (!mixers.length) return;
  element.dataset.morphing = "true";
  tracks.set(element, {
    start: performance.now(),
    duration: 280,
    targets,
    mixers,
  });
  if (!running) {
    running = true;
    frame.update(tick, true);
  }
}

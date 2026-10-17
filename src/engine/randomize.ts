import { random } from "./geometry";
import { generateComposition } from "./generate";
import { FAMILIES, LIMITS, type Design, type RenderSettings } from "./model";

export function randomizeDesign(design: Design, seed: number): Design {
  const rng = random(seed),
    color = () =>
      `#${Math.floor(rng() * 0x1000000)
        .toString(16)
        .padStart(6, "0")}`;
  const between = (min: number, max: number, step = 1) =>
    Math.round((min + rng() * (max - min)) / step) * step;
  const geometry = Object.fromEntries(
    Object.entries(LIMITS).map(([key, [min, max]]) => [key, between(min, max)]),
  );
  const stopCount = between(2, 4);
  const render: RenderSettings = {
    depth: between(1, 100),
    bevel: between(0, 5, 0.1),
    roughness: rng(),
    metalness: rng(),
    sideColor: color(),
    separateSide: rng() > 0.5,
    outline: between(0, 5, 0.1),
    outlineColor: color(),
    shadow: rng() * 0.8,
    shadowSoftness: rng() * 12,
    light: between(0.2, 8, 0.1),
    lightAngle: between(-180, 180),
    lightHeight: between(1, 12, 0.1),
    elevation: rng() * 1.5,
    rotationX: between(-180, 180),
    rotationY: between(-180, 180),
    rotationZ: between(-180, 180),
    autoRotate: rng() > 0.65,
    background: color(),
    transparent: rng() > 0.5,
  };
  return {
    ...design,
    ...geometry,
    family: FAMILIES[Math.floor(rng() * FAMILIES.length)],
    seed,
    color: color(),
    gradient:
      rng() > 0.5
        ? {
            type: rng() > 0.5 ? "linear" : "radial",
            angle: between(0, 360),
            stops: Array.from({ length: stopCount }, (_, i) => ({
              id: `random-${i}`,
              color: color(),
              position: i / (stopCount - 1),
            })),
          }
        : null,
    shapes: generateComposition(seed).map((s) => ({
      ...s,
      points: between(3, 24),
      inner: between(0.08, 0.95, 0.01),
      tension: between(0.2, 8, 0.05),
      twist: between(-180, 180),
      irregularity: rng() * 0.7,
      thickness: between(0.04, 0.48, 0.01),
      seed: Math.floor(rng() * 2147483647),
    })),
    alternates: Object.fromEntries(
      Array.from(design.text).map((_, i) => [
        i,
        Math.floor(rng() * 2147483647),
      ]),
    ),
    render,
  };
}

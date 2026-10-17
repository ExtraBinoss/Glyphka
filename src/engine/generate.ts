import { random } from "./geometry";
import { DEFAULT_DESIGN, type Shape, type ShapeKind } from "./model";

export function generateComposition(seed: number): Shape[] {
  const rng = random(seed),
    recipe = Math.floor(rng() * 12);
  const shapes: Shape[] = [];
  const part = (
    kind: ShapeKind,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0,
    cutout = false,
  ) =>
    shapes.push({
      id: `${seed}-${shapes.length}`,
      kind,
      x,
      y,
      width,
      height,
      rotation,
      cutout,
      points: 3 + Math.floor(rng() * 12),
      inner: 0.18 + rng() * 0.62,
      tension: 0.5 + rng() * 4,
      twist: -90 + rng() * 180,
      irregularity: rng() * 0.35,
      thickness: 0.12 + rng() * 0.25,
      seed: Math.floor(rng() * 2147483647),
    });
  const angle = Math.round(-15 + rng() * 30),
    weight = Math.round(26 + rng() * 20);
  if (recipe === 0) {
    return DEFAULT_DESIGN.shapes.map((s, i) => ({
      ...s,
      id: `${seed}-${i}`,
      rotation: s.rotation + angle * 0.5,
      width: s.width * (0.85 + rng() * 0.3),
    }));
  }
  if (recipe >= 4) {
    const kinds: ShapeKind[] = [
      "superformula",
      "rosette",
      "blob",
      "star",
      "clover",
      "scallop",
      "polygon",
      "spiral",
    ];
    const kind = kinds[(recipe - 4) % kinds.length];
    part(kind, 300, 205, 170 + rng() * 100, 170 + rng() * 100, angle * 3);
    if (rng() > 0.3)
      part(
        rng() > 0.5 ? "disc" : "polygon",
        300,
        205,
        45 + rng() * 45,
        45 + rng() * 45,
        angle,
        true,
      );
    if (rng() > 0.4) {
      part("capsule", 300, 205, 35, 270, -35 + rng() * 70);
      part("disc", 300, 364, 22, 22);
    }
    if (rng() > 0.6) part("capsule", 300, 190, 280, 8, -50 + rng() * 100, true);
    return shapes;
  }
  if (recipe === 1) {
    part("capsule", 260, 214, weight, 244, -26 + angle);
    part("capsule", 343, 214, weight + 9, 244, 26 + angle);
    part("capsule", 262, 113, 126, weight, angle);
    part("disc", 230, 260, weight + 8, weight + 8, 0, true);
    part("capsule", 290, 250, 93, weight * 0.55, -angle);
  } else if (recipe === 2) {
    part("ring", 300, 216, 246, 224, angle);
    part("capsule", 300, 216, weight, 280, -36 + angle);
    part("capsule", 320, 233, 270, weight, 15 + angle);
    part("disc", 200, 140, weight * 0.65, weight * 0.65, 0, true);
    part("capsule", 360, 202, 130, 10, 44, true);
  } else {
    part("arc", 294, 235, 236, 218, angle);
    part("capsule", 250, 239, weight, 195, 30 + angle);
    part("capsule", 306, 273, 172, weight, -34 + angle);
    part("disc", 245, 346, weight, weight);
    part("disc", 374, 228, weight * 0.6, weight * 0.6, 0, true);
  }
  return shapes;
}

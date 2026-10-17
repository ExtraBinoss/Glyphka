import type { Shape } from "./model";

const f = (n: number) => Math.round(n * 1000) / 1000;
const polygon = (points: number[][]) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join("") + "Z";
export function proceduralPath(shape: Shape): string | null {
  const { kind, width: w, height: h } = shape,
    rx = w / 2,
    ry = h / 2,
    points = shape.points ?? 5,
    inner = shape.inner ?? 0.48,
    tension = shape.tension ?? 2,
    twist = ((shape.twist ?? 0) * Math.PI) / 180,
    irregularity = shape.irregularity ?? 0,
    seed = shape.seed ?? 17;
  const ring = (r: number[], phase = 0) =>
    polygon(
      r.map((radius, i) => {
        const a = (i / r.length) * Math.PI * 2 - Math.PI / 2 + phase;
        return [Math.cos(a) * rx * radius, Math.sin(a) * ry * radius];
      }),
    );
  if (kind === "rectangle") return `M${-rx} ${-ry}H${rx}V${ry}H${-rx}Z`;
  if (kind === "polygon") return ring(Array.from({ length: points }, () => 1));
  if (kind === "star")
    return ring(
      Array.from({ length: points * 2 }, (_, i) => (i % 2 ? inner : 1)),
    );
  if (kind === "cross") {
    const a = inner * 0.8;
    return polygon(
      [
        [-a, -1],
        [a, -1],
        [a, -a],
        [1, -a],
        [1, a],
        [a, a],
        [a, 1],
        [-a, 1],
        [-a, a],
        [-1, a],
        [-1, -a],
        [-a, -a],
      ].map(([x, y]) => [x * rx, y * ry]),
    );
  }
  if (kind === "arrow")
    return polygon(
      [
        [-1, -0.28],
        [0.1, -0.28],
        [0.1, -1],
        [1, 0],
        [0.1, 1],
        [0.1, 0.28],
        [-1, 0.28],
      ].map(([x, y]) => [x * rx, y * ry]),
    );
  if (kind === "chevron")
    return polygon(
      [
        [-1, -1],
        [-0.25, -1],
        [1, 0],
        [-0.25, 1],
        [-1, 1],
        [0.25, 0],
      ].map(([x, y]) => [x * rx, y * ry]),
    );
  if (kind === "teardrop")
    return `M0 ${-ry}C${rx * 0.35} ${-ry * 0.3} ${rx} ${-ry * 0.1} ${rx} ${ry * 0.35}C${rx} ${ry * 1.2} ${-rx} ${ry * 1.2} ${-rx} ${ry * 0.35}C${-rx} ${-ry * 0.1} ${-rx * 0.35} ${-ry * 0.3} 0 ${-ry}Z`;
  if (kind === "heart")
    return `M0 ${ry}C${-rx * 1.8} ${-ry * 0.1} ${-rx * 0.65} ${-ry * 1.55} 0 ${-ry * 0.4}C${rx * 0.65} ${-ry * 1.55} ${rx * 1.8} ${-ry * 0.1} 0 ${ry}Z`;
  if (kind === "moon")
    return `M${rx * 0.3} ${-ry}A${rx} ${ry} 0 1 0 ${rx * 0.3} ${ry}C${-rx * 0.65} ${ry * 0.45} ${-rx * 0.65} ${-ry * 0.45} ${rx * 0.3} ${-ry}Z`;
  if (kind === "spiral" || kind === "wave") {
    const steps = 120,
      thick = (shape.thickness ?? 0.22) * Math.min(w, h) * 0.42;
    const center = (t: number) =>
      kind === "spiral"
        ? {
            x:
              Math.cos(t * Math.PI * 2 * (1 + points / 5)) *
              (0.1 + t * 0.85) *
              rx,
            y:
              Math.sin(t * Math.PI * 2 * (1 + points / 5)) *
              (0.1 + t * 0.85) *
              ry,
          }
        : {
            x: (t * 2 - 1) * rx,
            y: Math.sin(t * Math.PI * 2 * (points / 3)) * ry * 0.7,
          };
    const sides = [1, -1].map((side) =>
      Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps,
          p = center(t),
          a = center(Math.min(1, t + 0.001)),
          b = center(Math.max(0, t - 0.001)),
          angle = Math.atan2(a.y - b.y, a.x - b.x);
        return [
          p.x - Math.sin(angle) * thick * side,
          p.y + Math.cos(angle) * thick * side,
        ];
      }),
    );
    return polygon([...sides[0], ...sides[1].reverse()]);
  }
  if (!["clover", "blob", "rosette", "superformula", "scallop"].includes(kind))
    return null;
  const coords = Array.from({ length: 192 }, (_, i) => {
    const a = (i / 192) * Math.PI * 2;
    let radius = 1;
    if (kind === "superformula") {
      const n1 = tension,
        n2 = 0.5 + inner * 7,
        n3 = 0.5 + inner * 7;
      radius = Math.pow(
        Math.pow(Math.abs(Math.cos((points * a) / 4)), n2) +
          Math.pow(Math.abs(Math.sin((points * a) / 4)), n3),
        -1 / n1,
      );
      radius = Math.min(2.8, radius);
    } else if (kind === "blob")
      radius =
        0.77 +
        Math.sin(a * 3 + seed) * 0.1 +
        Math.sin(a * 5 + seed * 0.43) * 0.07 +
        Math.cos(a * 2 + seed * 0.31) * 0.06;
    else if (kind === "clover")
      radius = 0.65 + Math.cos(a * Math.max(3, points)) * 0.28;
    else if (kind === "scallop")
      radius = 0.84 + Math.abs(Math.cos((a * points) / 2)) * 0.16;
    else radius = 0.64 + Math.cos(a * points) * inner * 0.6;
    radius *=
      1 +
      irregularity *
        (Math.sin(a * 3 + seed) * 0.35 + Math.cos(a * 7 + seed * 0.19) * 0.25);
    const angle = a + twist * (radius - 0.5);
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
  const maxX = Math.max(...coords.map((p) => Math.abs(p[0]))),
    maxY = Math.max(...coords.map((p) => Math.abs(p[1])));
  return polygon(coords.map(([x, y]) => [(x / maxX) * rx, (y / maxY) * ry]));
}

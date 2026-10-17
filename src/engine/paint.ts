import type { GradientFill } from "./model";

export const DEFAULT_GRADIENT: GradientFill = {
  type: "linear",
  angle: 120,
  stops: [
    { id: "start", color: "#2563eb", position: 0 },
    { id: "end", color: "#a855f7", position: 1 },
  ],
};

export function gradientVector(angle: number, width: number, height: number) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians),
    dy = -Math.cos(radians);
  const length = Math.abs(width * dx) + Math.abs(height * dy);
  return {
    x1: (width - dx * length) / 2,
    y1: (height - dy * length) / 2,
    x2: (width + dx * length) / 2,
    y2: (height + dy * length) / 2,
  };
}

export function gradientCss(fill: GradientFill) {
  const stops = fill.stops
    .map((s) => `${s.color} ${s.position * 100}%`)
    .join(", ");
  return fill.type === "radial"
    ? `radial-gradient(ellipse at center, ${stops})`
    : `linear-gradient(${fill.angle}deg, ${stops})`;
}

export function gradientSvg(
  fill: GradientFill,
  width: number,
  height: number,
  id: string,
) {
  if (!Number.isFinite(fill.angle)) throw new Error("Invalid gradient angle");
  const stops = fill.stops
    .map((s) => {
      if (!/^#[\da-f]{6}$/i.test(s.color) || !Number.isFinite(s.position))
        throw new Error("Invalid gradient stop");
      return `<stop offset="${Math.max(0, Math.min(1, s.position))}" stop-color="${s.color}"/>`;
    })
    .join("");
  if (fill.type === "radial")
    return `<radialGradient id="${id}" r="70.710678%" color-interpolation="sRGB">${stops}</radialGradient>`;
  const v = gradientVector(fill.angle, width, height);
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${v.x1}" y1="${v.y1}" x2="${v.x2}" y2="${v.y2}" color-interpolation="sRGB">${stops}</linearGradient>`;
}

export function paintSvg(
  content: string,
  fill: GradientFill | null | undefined,
  width: number,
  height: number,
) {
  if (!fill) return content;
  return `<defs>${gradientSvg(fill, width, height, "color-gradient")}<mask id="paint-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">${content}</mask></defs><rect width="${width}" height="${height}" fill="url(#color-gradient)" mask="url(#paint-mask)"/>`;
}

import { interpolatePath } from "d3-interpolate-path";
import svgpath from "svgpath";

const normalized = new Map<string, string>();
function normalize(path: string) {
  let value = normalized.get(path);
  if (!value) {
    // d3-interpolate-path expects each segment's command to be explicit.
    // svgpath.toString() compresses repeated commands, so serialize the segments.
    const segments: string[] = [];
    svgpath(path)
      .abs()
      .unshort()
      .unarc()
      .round(3)
      .iterate((segment, _index, x, y) => {
        // Interpolation needs both coordinates when a line becomes a curve.
        // H/V omit one coordinate and can otherwise introduce NaN controls.
        if (segment[0] === "H") segments.push(`L ${segment[1]} ${y}`);
        else if (segment[0] === "V") segments.push(`L ${x} ${segment[1]}`);
        else segments.push(segment.join(" "));
      });
    value = segments.join(" ");
    normalized.set(path, value);
    if (normalized.size > 512)
      normalized.delete(normalized.keys().next().value!);
  }
  return value;
}
export function createPathMorph(from: string, to: string) {
  const a = normalize(from).match(/M[^M]*/g) ?? [],
    b = normalize(to).match(/M[^M]*/g) ?? [];
  const collapse = (path: string) => {
    const points: [number, number][] = [];
    svgpath(path).iterate((segment, _index, x, y) => {
      if (segment[0] === "Z" || segment[0] === "z") return;
      if (segment[0] === "H") points.push([segment[1], y]);
      else if (segment[0] === "V") points.push([x, segment[1]]);
      else if (segment.length >= 3)
        points.push([
          segment[segment.length - 2] as number,
          segment[segment.length - 1] as number,
        ]);
    });
    const x =
      points.reduce((sum, point) => sum + point[0], 0) / (points.length || 1);
    const y =
      points.reduce((sum, point) => sum + point[1], 0) / (points.length || 1);
    return `M${x},${y}${path.trim().endsWith("Z") ? "Z" : ""}`;
  };
  const parts = Array.from({ length: Math.max(a.length, b.length) }, (_, i) =>
    interpolatePath(a[i] ?? collapse(b[i]), b[i] ?? collapse(a[i])),
  );
  const interpolate = (progress: number) =>
    parts.map((part) => part(progress)).join(" ");
  return (progress: number) =>
    progress <= 0 ? from : progress >= 1 ? to : interpolate(progress);
}

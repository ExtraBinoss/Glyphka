import ClipperLib from "clipper-lib";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { buildDrawing, glyphMarks, shapePath, type Mark } from "./geometry";
import type { Design } from "./model";

type Matrix = [number, number, number, number, number, number];
export type Point2 = [number, number];
export interface Polygon {
  outer: Point2[];
  holes: Point2[][];
}
export interface VectorDocument {
  polygons: Polygon[];
  width: number;
  height: number;
}
const SCALE = 1000,
  identity: Matrix = [1, 0, 0, 1, 0, 0];
function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
function matrix(source = ""): Matrix {
  let result = identity;
  for (const match of source.matchAll(
    /(translate|scale|rotate|skewX)\(([^)]+)\)/g,
  )) {
    const n = match[2].split(/[ ,]+/).map(Number),
      angle = (n[0] * Math.PI) / 180;
    let m: Matrix = identity;
    if (match[1] === "translate") m = [1, 0, 0, 1, n[0], n[1] ?? 0];
    if (match[1] === "scale") m = [n[0], 0, 0, n[1] ?? n[0], 0, 0];
    if (match[1] === "skewX") m = [1, 0, Math.tan(angle), 1, 0, 0];
    if (match[1] === "rotate")
      m = [
        Math.cos(angle),
        Math.sin(angle),
        -Math.sin(angle),
        Math.cos(angle),
        0,
        0,
      ];
    result = multiply(result, m);
  }
  return result;
}
function transform(paths: ClipperLib.Paths, m: Matrix): ClipperLib.Paths {
  return paths.map((path) =>
    path.map(({ X, Y }) => ({
      X: Math.round(m[0] * X + m[2] * Y + m[4] * SCALE),
      Y: Math.round(m[1] * X + m[3] * Y + m[5] * SCALE),
    })),
  );
}
function operation(
  subject: ClipperLib.Paths,
  clip: ClipperLib.Paths,
  type: ClipperLib.ClipType,
  fill = ClipperLib.PolyFillType.pftNonZero,
): ClipperLib.Paths {
  if (!subject.length) return [];
  const c = new ClipperLib.Clipper(),
    result: ClipperLib.Paths = [];
  c.StrictlySimple = true;
  c.AddPaths(subject, ClipperLib.PolyType.ptSubject, true);
  if (clip.length) c.AddPaths(clip, ClipperLib.PolyType.ptClip, true);
  c.Execute(type, result, fill, ClipperLib.PolyFillType.pftNonZero);
  return ClipperLib.Clipper.CleanPolygons(result, 0.03 * SCALE);
}
const loader = new SVGLoader();
// Curves are sampled into real planar contours. Stroke expansion and boolean
// subtraction happen before extrusion, so holes remain holes at every angle.
function markContours(mark: Mark, roundness: number): ClipperLib.Paths {
  const data = loader.parse(
    `<svg xmlns="http://www.w3.org/2000/svg"><path d="${mark.d}"/></svg>`,
  );
  const paths: ClipperLib.Paths = [];
  for (const path of data.paths)
    for (const sub of path.subPaths) {
      const points = sub.getPoints(20);
      const closed =
        sub.autoClose ||
        (points.length > 2 && points[0].distanceTo(points.at(-1)!) < 0.001);
      if (closed && points[0].distanceTo(points.at(-1)!) < 0.001) points.pop();
      const p = points.map((p) => ({
        X: Math.round(p.x * SCALE),
        Y: Math.round(p.y * SCALE),
      }));
      if (mark.stroke) {
        if (p.length < 2) continue;
        const offset = new ClipperLib.ClipperOffset(2, 0.06 * SCALE),
          result: ClipperLib.Paths = [];
        offset.AddPath(
          p,
          roundness > 45
            ? ClipperLib.JoinType.jtRound
            : roundness > 0
              ? ClipperLib.JoinType.jtSquare
              : ClipperLib.JoinType.jtMiter,
          closed
            ? ClipperLib.EndType.etClosedLine
            : roundness > 45
              ? ClipperLib.EndType.etOpenRound
              : roundness > 0
                ? ClipperLib.EndType.etOpenSquare
                : ClipperLib.EndType.etOpenButt,
        );
        offset.Execute(result, (mark.stroke * SCALE) / 2);
        paths.push(...result);
      } else if (p.length > 2) paths.push(p);
    }
  const clean = operation(
    paths,
    [],
    ClipperLib.ClipType.ctUnion,
    mark.stroke
      ? ClipperLib.PolyFillType.pftNonZero
      : ClipperLib.PolyFillType.pftEvenOdd,
  );
  return transform(clean, matrix(mark.transform));
}
export function buildVectorDocument(
  design: Design,
  mode: "wordmark" | "symbol" | "shapes",
  selected = 0,
): VectorDocument {
  const positive: ClipperLib.Paths = [],
    negative: ClipperLib.Paths = [];
  let width = 600,
    height = 440;
  if (mode === "shapes") {
    for (const shape of design.shapes) {
      const contours = markContours(
        { d: shapePath(shape, design.weight) },
        100,
      );
      const m = matrix(
        `translate(${shape.x} ${shape.y}) rotate(${shape.rotation})`,
      );
      (shape.cutout ? negative : positive).push(...transform(contours, m));
    }
  } else {
    const drawing = buildDrawing(
      design,
      mode === "symbol" ? selected : undefined,
    );
    width = drawing.width;
    height = drawing.height;
    for (const glyph of drawing.glyphs) {
      const marks = glyphMarks(
          glyph.char,
          design,
          design.alternates[glyph.index] ?? 0,
        ),
        plus: ClipperLib.Paths = [],
        minus: ClipperLib.Paths = [];
      for (const mark of marks)
        (mark.cutout ? minus : plus).push(
          ...markContours(mark, design.roundness),
        );
      const visible = operation(
        operation(plus, [], ClipperLib.ClipType.ctUnion),
        operation(minus, [], ClipperLib.ClipType.ctUnion),
        ClipperLib.ClipType.ctDifference,
      );
      positive.push(...transform(visible, matrix(glyph.transform)));
    }
  }
  const visible = operation(
    operation(positive, [], ClipperLib.ClipType.ctUnion),
    operation(negative, [], ClipperLib.ClipType.ctUnion),
    ClipperLib.ClipType.ctDifference,
  );
  const c = new ClipperLib.Clipper(),
    tree = new ClipperLib.PolyTree();
  c.AddPaths(visible, ClipperLib.PolyType.ptSubject, true);
  c.Execute(
    ClipperLib.ClipType.ctUnion,
    tree,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );
  const convert = (path: ClipperLib.Path): Point2[] =>
    path.map((p) => [p.X / SCALE, p.Y / SCALE]);
  return {
    width,
    height,
    polygons: ClipperLib.JS.PolyTreeToExPolygons(tree).map((p) => ({
      outer: convert(p.outer),
      holes: p.holes.map(convert),
    })),
  };
}

import type { Design, Shape } from "./model";
import { proceduralPath } from "./procedural";
import { paintSvg } from "./paint";

export interface Mark {
  d: string;
  stroke?: number;
  cutout?: boolean;
  transform?: string;
}
export interface Glyph {
  char: string;
  index: number;
  x: number;
  width: number;
  transform: string;
  marks: Mark[];
}
export interface Drawing {
  width: number;
  height: number;
  glyphs: Glyph[];
}
const n = (value: number) => Math.round(value * 1000) / 1000;
export function random(seed: number) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function circle(x: number, y: number, rx: number, ry = rx) {
  return `M${n(x - rx)} ${n(y)}a${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0Z`;
}
export function glyphMarks(char: string, design: Design, variant = 0): Mark[] {
  const { weight: w, family, cutouts } = design;
  const radius = design.roundness / 100;
  const rng = random(design.seed + char.charCodeAt(0) * 117);
  const v = variant % 4;
  const generation = Math.floor(variant / 4);
  const bend = ["orbital", "soft", "flux", "ribbon", "lunar", "halo"].includes(
    family,
  );
  const y = 40 + (rng() - 0.5) * 12;
  const marks: Mark[] = [];
  const line = (d: string, weight = w) => marks.push({ d, stroke: weight });
  const dot = (x: number, y: number, r = w * 0.2, cutout = false) =>
    marks.push({ d: circle(x, y, r), cutout });
  // Each letter is constructed from geometry; no typeface or embedded font is used.
  switch (char) {
    case "A":
      if (v === 1 || family === "modular") {
        line("M12 84L43 16L76 84");
        line("M27 58H62");
      } else {
        line(v === 2 ? "M16 84L46 16H62L82 84" : "M13 16H50L78 84", w * 1.12);
        line("M40 45L17 84", w * 0.82);
        if (v === 3) line("M29 61H54", w * 0.7);
      }
      break;
    case "B":
      line("M15 84V16H48Q80 16 77 35Q76 49 50 49H29");
      line("M45 49Q83 49 80 68Q78 84 51 84H33");
      break;
    case "C":
      line(
        bend
          ? "M73 25C25 -6 -8 50 22 76Q42 96 73 77"
          : "M74 18H39Q14 18 14 43V59Q14 82 39 82H74",
      );
      break;
    case "D":
      line("M15 16V84H43Q81 84 81 50T43 16H34");
      break;
    case "E":
      line(v === 1 ? "M76 16H17V84H76" : "M17 16H77M17 50H63M17 84H77");
      if (v === 2) line("M17 16V84", w * 0.72);
      break;
    case "F":
      line("M17 84V16H77");
      line("M37 49H65");
      break;
    case "G":
      line("M74 24Q57 8 32 18T14 58Q14 84 45 84H76V51H52");
      break;
    case "H":
      line("M16 16V84M78 16V84");
      line(v === 1 ? "M16 61L78 40" : "M16 50H78");
      break;
    case "I":
      if (v === 1) line("M14 16H40M27 16V84M14 84H40");
      else if (v === 2) {
        line("M15 84L33 40");
        dot(39, 16, w * 0.43);
      } else if (v === 3) {
        line("M27 16V40M27 64V84");
      } else {
        line("M27 39V84");
        dot(27, 16, w * 0.49);
      }
      break;
    case "J":
      line("M24 16H75V58Q75 84 47 84T17 62");
      break;
    case "K":
      line("M16 16V84");
      line(
        v === 1 ? "M78 16L39 50L78 84" : "M73 16L36 49M43 56L77 84",
        w * 0.93,
      );
      break;
    case "L":
      line(
        v === 1
          ? "M17 16L24 84H76"
          : v === 2
            ? "M17 16V65M17 84H76"
            : v === 3
              ? "M17 16V58Q17 84 43 84H76"
              : "M17 16V84H76",
      );
      break;
    case "M":
      line(
        bend
          ? "M12 84V38Q12 5 43 43Q74 5 74 38V84"
          : "M12 84V16L44 52L76 16V84",
      );
      break;
    case "N":
      line(
        v === 2
          ? "M14 84V16H38L77 84V16"
          : v === 1
            ? "M15 84V16L77 68V16"
            : v === 3
              ? "M15 84V16Q46 16 77 84V16"
              : "M15 84V16L77 84V16",
      );
      break;
    case "O":
      line(
        bend
          ? "M47 15C1 15 1 85 47 85S93 15 47 15Z"
          : "M41 16H53Q80 16 80 43V57Q80 84 53 84H41Q14 84 14 57V43Q14 16 41 16Z",
      );
      break;
    case "P":
      if (v === 3) {
        line("M16 84L24 16H52Q81 16 79 39T48 62H37");
      } else if (v === 1) {
        line("M16 84V16H48Q83 16 80 39T42 60H35");
      } else {
        line("M16 84V16H52Q80 16 80 37T52 58H38");
        if (v === 2) line("M40 58L24 84", w * 0.65);
      }
      break;
    case "Q":
      line("M47 16C2 16 2 84 47 84S92 16 47 16Z");
      line("M57 66L84 89", w * 0.75);
      break;
    case "R":
      line("M16 84V16H52Q80 16 80 37T52 58H36");
      line("M47 59L79 84");
      break;
    case "S":
      line(
        bend
          ? "M75 24Q27 -2 17 27T45 50Q83 53 77 73T15 77"
          : "M76 16H37Q15 16 15 33T38 50H54Q78 50 78 67T53 84H15",
      );
      break;
    case "T":
      line("M12 16H80M46 37V84");
      break;
    case "U":
      line("M15 16V59Q15 84 46 84T77 59V16");
      break;
    case "V":
      line("M12 16L44 84L78 16");
      break;
    case "W":
      line("M8 16L23 84L46 47L69 84L84 16", w * 0.9);
      break;
    case "X":
      line("M15 16L77 84M77 16L15 84");
      break;
    case "Y":
      line("M12 16L46 53L80 16M46 53V84");
      break;
    case "Z":
      line("M15 16H77L15 84H77");
      break;
    case "0":
      line("M47 16C2 16 2 84 47 84S92 16 47 16Z");
      line("M29 69L65 31", w * 0.45);
      break;
    case "1":
      line("M13 35L29 16V84");
      break;
    case "2":
      line("M16 29Q16 10 48 16T77 43L16 84H77");
      break;
    case "3":
      line("M15 16H52Q80 16 77 34T45 49M49 49Q82 49 78 68T15 84");
      break;
    case "4":
      line("M64 84V16L13 61H80");
      break;
    case "5":
      line("M76 16H17V49H52Q80 49 78 67T52 84H17");
      break;
    case "6":
      line("M73 16H48Q15 16 15 50V61Q15 84 47 84T79 62T46 43H29");
      break;
    case "7":
      line("M14 16H79L33 84");
      break;
    case "8":
      line(
        "M46 16C3 16 10 49 46 49S89 16 46 16ZM46 49C2 49 2 84 46 84S90 49 46 49Z",
      );
      break;
    case "9":
      line("M20 84H47Q79 84 79 50V39Q79 16 47 16T15 38T48 57H65");
      break;
    case ".":
      dot(18, 84, w * 0.5);
      break;
    case "-":
      line("M15 50H60");
      break;
    case "+":
      line("M16 50H76M46 20V80");
      break;
    default:
      break;
  }
  if (family === "orbital" && /[ABDPQR]/.test(char)) dot(50, 34, w * 0.13);
  if (["halo", "ribbon", "neon"].includes(family))
    marks.push(
      ...marks
        .filter((m) => m.stroke && !m.cutout)
        .map((m) => ({
          ...m,
          stroke: m.stroke! * (family === "neon" ? 0.7 : 0.48),
          cutout: true,
        })),
    );
  if (["fracture", "fold"].includes(family))
    marks.push({
      d: "M-10 72L104 28",
      stroke: family === "fold" ? 8 : 4,
      cutout: true,
    });
  // Bounded path treatments preserve editable vector geometry in every renderer.
  const cut = (d: string, stroke?: number) =>
    marks.push({ d, stroke, cutout: true });
  switch (family) {
    case "duplex":
      marks.push(
        ...marks
          .filter((mark) => mark.stroke && !mark.cutout)
          .map((mark) => ({
            ...mark,
            stroke: mark.stroke! * 0.34,
            cutout: true,
          })),
      );
      break;
    case "segmented":
      cut("M-10 33H108M-10 64H108", 5);
      break;
    case "notched":
      cut("M2 29L25 39L2 49ZM87 46L63 57L87 68Z");
      break;
    case "woven":
      cut("M-15 62L104 8M-15 92L104 38", 7);
      break;
    case "prism":
      cut("M-12 89L99 23", 3.5);
      break;
    case "terminal":
      for (const mark of marks.filter((item) => item.stroke && !item.cutout)) {
        const start = mark.d.match(/^M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/);
        if (start) dot(Number(start[1]), Number(start[2]), w * 0.78);
      }
      break;
    case "raster":
      cut("M-10 24H108M-10 36H108M-10 48H108M-10 60H108M-10 72H108", 3);
      break;
    case "crosscut":
      cut("M-8 14L101 88M-8 88L101 14", 5);
      break;
  }
  if (cutouts > 0 && ![" ", ".", "-", "+"].includes(char)) {
    if (cutouts >= 15)
      dot(
        char === "I" ? 27 : 18,
        char === "I" ? 64 : 19,
        w * 0.13 + cutouts * 0.027,
        true,
      );
    if (cutouts >= 40)
      marks.push({
        d: `M-10 ${n(y)}H110`,
        stroke: 2 + cutouts * 0.055,
        cutout: true,
      });
    if (cutouts >= 70) dot(74, 80, w * 0.19, true);
  }
  // Rounding continuously adjusts the curve handles, alongside cap/join shape.
  // The affine alternatives also provide four distinct constructions for the
  // less frequent glyphs without requiring a downloaded alphabet.
  const transform =
    v === 1
      ? "translate(4 0) scale(.92 1)"
      : v === 2
        ? "translate(-5 0) skewX(9)"
        : v === 3
          ? "translate(0 4) scale(1 .9)"
          : undefined;
  return marks.map((mark) => ({
    ...mark,
    transform,
    d: distortPath(
      mark.d.replace(
        /Q(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
        (_, a, b, c, d) =>
          `Q${n(Number(a) + (Number(c) - Number(a)) * (1 - radius) * 0.32)} ${n(Number(b) + (Number(d) - Number(b)) * (1 - radius) * 0.32)} ${c} ${d}`,
      ),
      design.seed + generation * 913 + char.charCodeAt(0),
      design.mutation + Math.min(70, generation * 11),
      !!mark.stroke && !mark.cutout,
      family === "circuit" || family === "prism",
    ),
    stroke:
      mark.stroke && !mark.cutout
        ? mark.stroke * (v === 3 ? 0.86 : 1)
        : mark.stroke,
  }));
}
export function glyphWidth(char: string) {
  return char === " "
    ? 40
    : /[I1.]/.test(char)
      ? 50
      : char === "-"
        ? 73
        : char === "W"
          ? 96
          : 92;
}
export function buildDrawing(design: Design, singleIndex?: number): Drawing {
  const text = design.text || " ";
  let cursor = 0;
  const glyphs: Glyph[] = [];
  const squish = design.width / 100;
  const chars =
    singleIndex === undefined
      ? Array.from(text).map((char, index) => ({ char, index }))
      : [{ char: text[singleIndex] ?? "P", index: singleIndex }];
  const shear = Math.tan((design.slant * Math.PI) / 180);
  const extra = Math.abs(shear) * 105;
  for (const { char, index } of chars) {
    const width = glyphWidth(char) * squish;
    glyphs.push({
      char,
      index,
      x: cursor + 22 + extra,
      width,
      transform: `translate(${n(cursor + 22 + extra)} 24) skewX(${design.slant}) scale(${n(squish)} 1)`,
      marks: glyphMarks(char, design, design.alternates[index] ?? 0),
    });
    cursor += width + design.tracking;
  }
  return {
    width: Math.max(70, cursor - design.tracking + 42 + extra * 2),
    height: 148,
    glyphs,
  };
}
const shapePaths = new Map<string, string>();
let shapeCacheBytes = 0;
export function shapePath(shape: Shape, weight = 23): string {
  const key = JSON.stringify([
    shape.kind,
    shape.width,
    shape.height,
    shape.points,
    shape.inner,
    shape.tension,
    shape.twist,
    shape.irregularity,
    shape.seed,
    shape.thickness,
    weight,
  ]);
  const cached = shapePaths.get(key);
  if (cached !== undefined) {
    shapePaths.delete(key);
    shapePaths.set(key, cached);
    return cached;
  }
  const path = buildShapePath(shape, weight);
  shapePaths.set(key, path);
  shapeCacheBytes += (key.length + path.length) * 2;
  while (shapePaths.size > 256 || shapeCacheBytes > 2 * 1024 * 1024) {
    const oldest = shapePaths.keys().next().value!;
    shapeCacheBytes -= (oldest.length + shapePaths.get(oldest)!.length) * 2;
    shapePaths.delete(oldest);
  }
  return path;
}
function buildShapePath(shape: Shape, weight: number): string {
  const procedural = proceduralPath(shape);
  if (procedural) return procedural;
  const w = shape.width,
    h = shape.height;
  const x = -w / 2,
    y = -h / 2;
  const r = Math.min(Math.min(w, h) / 2, Math.min(w, h) / (shape.tension ?? 2));
  switch (shape.kind) {
    case "disc":
      return circle(0, 0, w / 2, h / 2);
    case "ring": {
      const inset = Math.min(w, h) * (shape.thickness ?? 0.26);
      return `${circle(0, 0, w / 2, h / 2)} ${circle(0, 0, w / 2 - inset, h / 2 - inset)}`;
    }
    case "arc": {
      const rx = w / 2,
        ry = h / 2,
        t = Math.min(
          Math.min(w, h) * 0.48,
          shape.thickness === undefined
            ? weight * 1.5
            : Math.min(w, h) * shape.thickness,
        );
      const irx = Math.max(2, rx - t),
        iry = Math.max(2, ry - t);
      return `M${-rx} 0A${rx} ${ry} 0 1 1 ${rx} 0L${irx} 0A${irx} ${iry} 0 1 0 ${-irx} 0Z`;
    }
    case "triangle":
      return `M0 ${y}L${w / 2} ${h / 2}H${x}Z`;
    case "diamond":
      return `M0 ${y}L${w / 2} 0L0 ${h / 2}L${x} 0Z`;
    default:
      return `M${x + r} ${y}H${w / 2 - r}Q${w / 2} ${y} ${w / 2} ${y + r}V${h / 2 - r}Q${w / 2} ${h / 2} ${w / 2 - r} ${h / 2}H${x + r}Q${x} ${h / 2} ${x} ${h / 2 - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
  }
}
export const escapeXml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (ch) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[ch]!,
  );
export function markSvg(mark: Mark, color: string, roundness: number) {
  const cap = roundness > 45 ? "round" : roundness > 0 ? "square" : "butt";
  const join = roundness > 45 ? "round" : roundness > 0 ? "bevel" : "miter";
  return `<path d="${mark.d}"${mark.transform ? ` transform="${mark.transform}"` : ""}${mark.stroke ? ` fill="none" stroke="${color}" stroke-width="${mark.stroke}" stroke-linecap="${cap}" stroke-linejoin="${join}"` : ` fill="${color}"`}/>`;
}
export function serializeSvg(
  design: Design,
  mode: "wordmark" | "symbol" | "shapes",
  ink: string,
  selected = 0,
) {
  if (!/^#[\da-f]{6}$/i.test(ink)) throw new Error("Invalid ink");
  const paint = design.gradient ? "#ffffff" : ink;
  if (mode === "shapes") {
    const p = (s: Shape, color: string) =>
      `<path d="${shapePath(s, design.weight)}" transform="translate(${s.x} ${s.y}) rotate(${s.rotation})" fill="${color}" fill-rule="evenodd"/>`;
    const content = `<defs><mask id="cuts" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="440"><rect width="600" height="440" fill="white"/>${design.shapes
      .filter((s) => s.cutout)
      .map((s) => p(s, "black"))
      .join("")}</mask></defs><g mask="url(#cuts)">${design.shapes
      .filter((s) => !s.cutout)
      .map((s) => p(s, paint))
      .join("")}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 440" width="1200" height="880" role="img"><title>${escapeXml(design.text || "Symbol")}</title>${paintSvg(content, design.gradient, 600, 440)}</svg>`;
  }
  const drawing = buildDrawing(
    design,
    mode === "symbol" ? selected : undefined,
  );
  const groups = drawing.glyphs
    .map((glyph, i) => {
      const cuts = glyph.marks.filter((m) => m.cutout),
        positive = glyph.marks.filter((m) => !m.cutout);
      const mask = cuts.length
        ? `<defs><mask id="cut-${i}" maskUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200"><rect x="-50" y="-50" width="200" height="200" fill="white"/>${cuts.map((m) => markSvg(m, "black", design.roundness)).join("")}</mask></defs>`
        : "";
      return `<g transform="${glyph.transform}">${mask}<g${cuts.length ? ` mask="url(#cut-${i})"` : ""}>${positive.map((m) => markSvg(m, paint, design.roundness)).join("")}</g></g>`;
    })
    .join("");
  const width = 1200,
    height = Math.round((width * drawing.height) / drawing.width);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${drawing.width} ${drawing.height}" width="${width}" height="${height}" role="img"><title>${escapeXml(design.text || "Wordmark")}</title>${paintSvg(groups, design.gradient, drawing.width, drawing.height)}</svg>`;
}

function distortPath(
  d: string,
  seed: number,
  amount: number,
  enabled: boolean,
  angular = false,
): string {
  if (!enabled || (!amount && !angular)) return d;
  let x = 0,
    y = 0;
  const a = amount * 0.075;
  const point = (px: number, py: number) =>
    `${n(px + Math.sin(py * 0.055 + seed) * a)} ${n(py + Math.sin(px * 0.065 + seed * 0.37) * a)}`;
  return d.replace(/([MLCQHVSTZ])([^MLCQHVSTZ]*)/g, (whole, command, args) => {
    if (command === " " || command === "Z")
      return command === "Z" ? "Z" : whole;
    const v = (args.match(/-?\d*\.?\d+/g) || []).map(Number);
    if (command === "H") {
      x = v[0];
      return `L${point(x, y)}`;
    }
    if (command === "V") {
      y = v[0];
      return `L${point(x, y)}`;
    }
    const pairs = [];
    for (let i = 0; i < v.length; i += 2) pairs.push(point(v[i], v[i + 1]));
    if (v.length) {
      x = v.at(-2)!;
      y = v.at(-1)!;
    }
    return `${angular && command === "Q" ? "L" : command}${pairs.join(angular && command === "Q" ? "L" : " ")}`;
  });
}

export const FAMILIES = [
  "signal",
  "orbital",
  "stencil",
  "modular",
  "razor",
  "soft",
  "flux",
  "circuit",
  "ribbon",
  "brutal",
  "halo",
  "fracture",
  "mono",
  "lunar",
  "neon",
  "fold",
] as const;
export type Family = (typeof FAMILIES)[number];
export type Mode = "wordmark" | "symbol" | "shapes" | "about";
export const SHAPE_KINDS = [
  "capsule",
  "disc",
  "ring",
  "arc",
  "triangle",
  "diamond",
  "rectangle",
  "polygon",
  "star",
  "cross",
  "clover",
  "blob",
  "teardrop",
  "heart",
  "moon",
  "chevron",
  "spiral",
  "wave",
  "rosette",
  "superformula",
  "scallop",
  "arrow",
] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];
export interface Shape {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  cutout: boolean;
  points?: number;
  inner?: number;
  tension?: number;
  twist?: number;
  irregularity?: number;
  thickness?: number;
  seed?: number;
}
export interface RenderSettings {
  depth: number;
  bevel: number;
  roughness: number;
  metalness: number;
  sideColor: string;
  separateSide: boolean;
  outline: number;
  outlineColor: string;
  shadow: number;
  shadowSoftness: number;
  light: number;
  lightAngle: number;
  lightHeight: number;
  elevation: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  autoRotate: boolean;
  background: string;
  transparent: boolean;
}
export const DEFAULT_RENDER: RenderSettings = {
  depth: 24,
  bevel: 1.5,
  roughness: 0.32,
  metalness: 0.28,
  sideColor: "#1746a2",
  separateSide: false,
  outline: 0,
  outlineColor: "#111111",
  shadow: 0.22,
  shadowSoftness: 4,
  light: 3.5,
  lightAngle: -35,
  lightHeight: 6,
  elevation: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  autoRotate: false,
  background: "#f6f7fb",
  transparent: true,
};
export interface Design {
  text: string;
  family: Family;
  weight: number;
  roundness: number;
  width: number;
  slant: number;
  tracking: number;
  cutouts: number;
  seed: number;
  color: string;
  alternates: Record<string, number>;
  shapes: Shape[];
  mutation: number;
  render: RenderSettings;
}
export const DEFAULT_DESIGN: Design = {
  text: "PLINKA",
  family: "signal",
  weight: 23,
  roundness: 90,
  width: 100,
  slant: -8,
  tracking: 14,
  cutouts: 30,
  seed: 17,
  color: "auto",
  alternates: {},
  mutation: 0,
  render: DEFAULT_RENDER,
  shapes: [
    {
      id: "stem",
      kind: "capsule",
      x: 236,
      y: 222,
      width: 38,
      height: 236,
      rotation: 18,
      cutout: false,
    },
    {
      id: "bowl",
      kind: "ring",
      x: 292,
      y: 153,
      width: 172,
      height: 144,
      rotation: 0,
      cutout: false,
    },
    {
      id: "arm",
      kind: "capsule",
      x: 278,
      y: 282,
      width: 160,
      height: 34,
      rotation: -38,
      cutout: false,
    },
    {
      id: "dot",
      kind: "disc",
      x: 206,
      y: 362,
      width: 28,
      height: 28,
      rotation: 0,
      cutout: false,
    },
  ],
};
export const PRESETS: Record<Family, Partial<Design>> = {
  signal: {
    family: "signal",
    mutation: 0,
    weight: 23,
    roundness: 90,
    width: 100,
    slant: -8,
    tracking: 14,
    cutouts: 30,
  },
  orbital: {
    family: "orbital",
    mutation: 0,
    weight: 17,
    roundness: 100,
    width: 108,
    slant: 0,
    tracking: 18,
    cutouts: 5,
  },
  stencil: {
    family: "stencil",
    mutation: 0,
    weight: 25,
    roundness: 70,
    width: 92,
    slant: -4,
    tracking: 16,
    cutouts: 72,
  },
  modular: {
    family: "modular",
    mutation: 0,
    weight: 24,
    roundness: 30,
    width: 100,
    slant: 0,
    tracking: 12,
    cutouts: 12,
  },
  razor: {
    family: "razor",
    mutation: 0,
    weight: 17,
    roundness: 0,
    width: 85,
    slant: -15,
    tracking: 19,
    cutouts: 44,
  },
  soft: {
    family: "soft",
    mutation: 0,
    weight: 30,
    roundness: 100,
    width: 115,
    slant: -3,
    tracking: 16,
    cutouts: 0,
  },
  flux: {
    family: "flux",
    weight: 24,
    roundness: 100,
    width: 108,
    slant: -10,
    tracking: 13,
    cutouts: 18,
    mutation: 32,
  },
  circuit: {
    family: "circuit",
    weight: 14,
    roundness: 0,
    width: 98,
    slant: 0,
    tracking: 20,
    cutouts: 58,
    mutation: 0,
  },
  ribbon: {
    family: "ribbon",
    weight: 27,
    roundness: 100,
    width: 115,
    slant: -9,
    tracking: 12,
    cutouts: 0,
    mutation: 20,
  },
  brutal: {
    family: "brutal",
    weight: 34,
    roundness: 0,
    width: 94,
    slant: 0,
    tracking: 15,
    cutouts: 45,
    mutation: 0,
  },
  halo: {
    family: "halo",
    weight: 29,
    roundness: 100,
    width: 106,
    slant: 0,
    tracking: 14,
    cutouts: 0,
    mutation: 0,
  },
  fracture: {
    family: "fracture",
    weight: 29,
    roundness: 50,
    width: 98,
    slant: -11,
    tracking: 15,
    cutouts: 85,
    mutation: 15,
  },
  mono: {
    family: "mono",
    weight: 13,
    roundness: 75,
    width: 95,
    slant: 0,
    tracking: 23,
    cutouts: 0,
    mutation: 0,
  },
  lunar: {
    family: "lunar",
    weight: 19,
    roundness: 100,
    width: 116,
    slant: 5,
    tracking: 20,
    cutouts: 21,
    mutation: 25,
  },
  neon: {
    family: "neon",
    weight: 20,
    roundness: 100,
    width: 106,
    slant: -5,
    tracking: 17,
    cutouts: 0,
    mutation: 0,
  },
  fold: {
    family: "fold",
    weight: 28,
    roundness: 10,
    width: 98,
    slant: -17,
    tracking: 12,
    cutouts: 58,
    mutation: 12,
  },
};
export const LIMITS = {
  weight: [10, 34],
  roundness: [0, 100],
  width: [65, 140],
  slant: [-20, 20],
  tracking: [-8, 48],
  cutouts: [0, 100],
  mutation: [0, 100],
} as const;
export type GeometryKey = keyof typeof LIMITS;
export function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .\-+]/g, "")
    .slice(0, 18);
}
const finite = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
export function validateDesign(raw: unknown): Design {
  if (!raw || typeof raw !== "object") throw new Error("Invalid design");
  const v = raw as Record<string, unknown>;
  const result: Design = { ...DEFAULT_DESIGN, alternates: {}, shapes: [] };
  if (typeof v.text === "string") result.text = normalizeText(v.text);
  if (FAMILIES.includes(v.family as Family)) result.family = v.family as Family;
  for (const key of Object.keys(LIMITS) as GeometryKey[]) {
    result[key] = finite(v[key], result[key], LIMITS[key][0], LIMITS[key][1]);
  }
  result.seed = Math.round(finite(v.seed, 17, 0, 999999));
  if (typeof v.color === "string" && /^(auto|#[\da-f]{6})$/i.test(v.color))
    result.color = v.color;
  if (v.alternates && typeof v.alternates === "object") {
    for (const [key, n] of Object.entries(v.alternates))
      if (/^\d{1,2}$/.test(key))
        result.alternates[key] = Math.round(finite(n, 0, 0, 2147483647));
  }
  if (Array.isArray(v.shapes))
    result.shapes = v.shapes.flatMap((rawShape, index) => {
      if (!rawShape || typeof rawShape !== "object") return [];
      const s = rawShape as Record<string, unknown>;
      if (!SHAPE_KINDS.includes(s.kind as ShapeKind)) return [];
      return [
        {
          id: `part-${index}`,
          kind: s.kind as ShapeKind,
          x: finite(s.x, 300, 0, 600),
          y: finite(s.y, 220, 0, 440),
          width: finite(s.width, 100, 12, 280),
          height: finite(s.height, 100, 12, 280),
          rotation: finite(s.rotation, 0, -180, 180),
          cutout: s.cutout === true,
          points: Math.round(finite(s.points, 5, 3, 24)),
          inner: finite(s.inner, 0.48, 0.08, 0.95),
          tension: finite(s.tension, 2, 0.2, 8),
          twist: finite(s.twist, 0, -180, 180),
          irregularity: finite(s.irregularity, 0, 0, 0.7),
          thickness: finite(s.thickness, 0.26, 0.04, 0.48),
          seed: Math.round(finite(s.seed, 17, 0, 2147483647)),
        },
      ];
    });
  if (v.render && typeof v.render === "object") {
    const r = v.render as Record<string, unknown>;
    result.render = { ...DEFAULT_RENDER };
    const ranges = {
      depth: [1, 100],
      bevel: [0, 5],
      roughness: [0, 1],
      metalness: [0, 1],
      outline: [0, 5],
      shadow: [0, 0.8],
      shadowSoftness: [0, 12],
      light: [0.2, 8],
      lightAngle: [-180, 180],
      lightHeight: [1, 12],
      elevation: [0, 1.5],
      rotationX: [-180, 180],
      rotationY: [-180, 180],
      rotationZ: [-180, 180],
    } as const;
    for (const key of Object.keys(ranges) as (keyof typeof ranges)[])
      result.render[key] = finite(
        r[key],
        DEFAULT_RENDER[key],
        ranges[key][0],
        ranges[key][1],
      );
    for (const key of ["sideColor", "outlineColor", "background"] as const)
      if (typeof r[key] === "string" && /^#[\da-f]{6}$/i.test(r[key]))
        result.render[key] = r[key];
    for (const key of ["separateSide", "autoRotate", "transparent"] as const)
      if (typeof r[key] === "boolean") result.render[key] = r[key];
  }
  return result;
}

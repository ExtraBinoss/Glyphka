import { expect, it } from "vitest";
import { installVectorParser } from "./svg-parser";
import { buildVectorDocument } from "./contours";
import { DEFAULT_DESIGN, FAMILIES, PRESETS, SHAPE_KINDS } from "./model";
import { shapePath } from "./geometry";
installVectorParser();

it("preserves transparent cutouts as actual 3D contour holes", () => {
  const doc = buildVectorDocument(
    {
      ...DEFAULT_DESIGN,
      shapes: [
        {
          id: "a",
          kind: "disc",
          x: 300,
          y: 220,
          width: 200,
          height: 200,
          rotation: 0,
          cutout: false,
        },
        {
          id: "b",
          kind: "disc",
          x: 300,
          y: 220,
          width: 60,
          height: 60,
          rotation: 0,
          cutout: true,
        },
      ],
    },
    "shapes",
  );
  expect(doc.polygons).toHaveLength(1);
  expect(doc.polygons[0].holes).toHaveLength(1);
  expect(doc.polygons[0].outer.length).toBeGreaterThan(20);
});
it("constructs fused, finite contours for lettering including mutations and hollow styles", () => {
  for (const family of FAMILIES) {
    const doc = buildVectorDocument(
      {
        ...DEFAULT_DESIGN,
        ...PRESETS[family],
        text: "PLINKA",
        alternates: { 0: 100 },
      },
      "wordmark",
    );
    expect(doc.polygons.length, family).toBeGreaterThan(0);
    expect(JSON.stringify(doc)).not.toMatch(/NaN|Infinity/);
  }
});
it("generates continuous procedural variations and closed paths for all shapes", () => {
  for (const kind of SHAPE_KINDS) {
    const shape = {
      ...DEFAULT_DESIGN.shapes[1],
      kind,
      points: 7,
      twist: 24,
      seed: 124,
    };
    expect(shapePath(shape)).not.toMatch(/NaN|Infinity/);
    const doc = buildVectorDocument(
      { ...DEFAULT_DESIGN, shapes: [shape] },
      "shapes",
    );
    expect(doc.polygons.length, kind).toBeGreaterThan(0);
  }
  const shape = { ...DEFAULT_DESIGN.shapes[1], kind: "superformula" as const };
  expect(shapePath({ ...shape, tension: 2 })).not.toBe(
    shapePath({ ...shape, tension: 2.01 }),
  );
});

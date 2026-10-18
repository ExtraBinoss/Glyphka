import { expect, it } from "vitest";
import { generateShapeCandidates } from "./generate";
import { shapePath } from "./geometry";
import { buildVectorDocument } from "./contours";
import { installVectorParser } from "./svg-parser";
import { DEFAULT_DESIGN } from "./model";
installVectorParser();

it("produces reproducible, varied editable shapes across new seeds", () => {
  const drawings = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    const shapes = generateShapeCandidates(seed);
    expect(shapes).toEqual(generateShapeCandidates(seed));
    expect(new Set(shapes.map((shape) => shape.kind)).size).toBe(18);
    for (const shape of shapes) {
      const path = shapePath(shape);
      expect(path).not.toMatch(/NaN|Infinity/);
      expect(path).toMatch(/Z$/i);
      expect(shape.rotation).toBe(0);
      drawings.add(path);
    }
  }
  expect(drawings.size).toBeGreaterThan(1700);
  const doc = buildVectorDocument(
    { ...DEFAULT_DESIGN, shapes: generateShapeCandidates(31) },
    "shapes",
  );
  expect(doc.polygons.length).toBeGreaterThan(0);
});

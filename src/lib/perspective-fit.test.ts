import { describe, expect, it } from "vitest";
import { perspectiveFitDistance } from "./perspective-fit";

describe("perspective framing", () => {
  for (const [width, height, depth, aspect, rotation] of [
    [6, 1.4, 0.6, 320 / 400, 0],
    [6, 1.4, 0.8, 390 / 600, 0.6],
    [1.8, 6, 1.2, 390 / 600, 0.4],
    [6, 3, 1, 1200 / 700, 0.8],
  ])
    it(`contains all corners of ${width}×${height}×${depth} at aspect ${aspect}`, () => {
      const points = [-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map((z) => ({
            x:
              ((x * width) / 2) * Math.cos(rotation) +
              ((z * depth) / 2) * Math.sin(rotation),
            y: (y * height) / 2,
            z:
              ((-x * width) / 2) * Math.sin(rotation) +
              ((z * depth) / 2) * Math.cos(rotation),
          })),
        ),
      );
      const distance = perspectiveFitDistance(points, 35, aspect);
      const tangent = Math.tan((35 * Math.PI) / 360);
      const extents = points.map((p) =>
        Math.max(
          Math.abs(p.x) / ((distance - p.z) * tangent * aspect),
          Math.abs(p.y) / ((distance - p.z) * tangent),
        ),
      );
      expect(Math.max(...extents)).toBeLessThanOrEqual(1 / 1.12 + 1e-10);
      expect(Math.max(...extents)).toBeGreaterThan(0.85);
    });
});

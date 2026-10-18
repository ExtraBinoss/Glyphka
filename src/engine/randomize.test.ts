import { expect, it } from "vitest";
import {
  DEFAULT_DESIGN,
  LIMITS,
  validateDesign,
  FAMILIES,
  PRESETS,
} from "./model";
import { randomizeDesign } from "./randomize";
import { generateVariations } from "./variations";
import { createPathMorph } from "./morph";
import { glyphMarks, shapePath } from "./geometry";
import svgpath from "svgpath";

it("randomizes geometry and rendering reproducibly while preserving the canvas background", () => {
  const samples = Array.from({ length: 40 }, (_, seed) =>
    randomizeDesign(DEFAULT_DESIGN, seed),
  );
  expect(randomizeDesign(DEFAULT_DESIGN, 42)).toEqual(
    randomizeDesign(DEFAULT_DESIGN, 42),
  );
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    expect(new Set(samples.map((s) => s[key])).size).toBeGreaterThan(1);
    for (const sample of samples)
      expect(sample[key]).toBeGreaterThanOrEqual(LIMITS[key][0]);
    for (const sample of samples)
      expect(sample[key]).toBeLessThanOrEqual(LIMITS[key][1]);
  }
  for (const key of Object.keys(
    DEFAULT_DESIGN.render,
  ) as (keyof typeof DEFAULT_DESIGN.render)[]) {
    if (
      [
        "background",
        "transparent",
        "rotationX",
        "rotationY",
        "rotationZ",
        "autoRotate",
        "autoRotateSpeed",
      ].includes(key)
    )
      continue;
    expect(
      new Set(samples.map((s) => s.render[key])).size,
      key,
    ).toBeGreaterThan(1);
  }
  for (const sample of samples) {
    expect(sample.text).toBe(DEFAULT_DESIGN.text);
    expect(sample.render.transparent).toBe(true);
    expect(sample.render.background).toBe(DEFAULT_DESIGN.render.background);
    expect(sample.render).toMatchObject({
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      autoRotate: false,
    });
    expect(validateDesign(sample).render).toEqual(sample.render);
    expect(sample.shapes.length).toBeGreaterThan(0);
    expect(JSON.stringify(sample)).not.toMatch(/NaN|Infinity/);
  }
  expect(samples.some((s) => s.gradient)).toBe(true);
  expect(samples.some((s) => !s.gradient)).toBe(true);
  const opaque = randomizeDesign(
    {
      ...DEFAULT_DESIGN,
      render: {
        ...DEFAULT_DESIGN.render,
        transparent: false,
        background: "#e88044",
      },
    },
    42,
  );
  expect(opaque.render).toMatchObject({
    transparent: false,
    background: "#e88044",
  });
  const directions = generateVariations(
    {
      ...DEFAULT_DESIGN,
      render: { ...DEFAULT_DESIGN.render, rotationX: 82, autoRotate: true },
    },
    17,
  );
  for (const direction of directions)
    expect(direction.render).toMatchObject({
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      autoRotate: false,
      transparent: true,
    });
});

it("morphs different glyph constructions and compound shapes through valid intermediate SVG", () => {
  for (let i = 0; i < FAMILIES.length - 1; i++) {
    const a = glyphMarks("P", {
      ...DEFAULT_DESIGN,
      ...PRESETS[FAMILIES[i]],
    }).find((m) => !m.cutout)!.d;
    const b = glyphMarks("P", {
      ...DEFAULT_DESIGN,
      ...PRESETS[FAMILIES[i + 1]],
    }).find((m) => !m.cutout)!.d;
    const morph = createPathMorph(a, b);
    expect(morph(0)).toBe(a);
    expect(morph(1)).toBe(b);
    for (const progress of [0.1, 0.5, 0.9]) {
      const path = morph(progress);
      expect(svgpath(path)).toHaveProperty("err", "");
      expect(path).not.toMatch(/NaN|Infinity|undefined/);
    }
  }
  const ring = shapePath({ ...DEFAULT_DESIGN.shapes[0], kind: "ring" });
  const heart = shapePath({ ...DEFAULT_DESIGN.shapes[0], kind: "heart" });
  const intermediate = createPathMorph(ring, heart)(0.5);
  expect(intermediate.match(/M/g)).toHaveLength(2);
  expect(svgpath(intermediate)).toHaveProperty("err", "");
});

import { describe, expect, it } from "vitest";
import { buildDrawing, glyphMarks, serializeSvg, shapePath } from "./geometry";
import {
  DEFAULT_DESIGN,
  FAMILIES,
  LIMITS,
  PRESETS,
  SHAPE_KINDS,
  normalizeText,
  validateDesign,
} from "./model";
import { generateComposition } from "./generate";
import { DEFAULT_GRADIENT } from "./paint";

describe("generated vector geometry", () => {
  it("exports whole-design linear and radial gradients while preserving transparent cutouts", () => {
    for (const type of ["linear", "radial"] as const)
      for (const mode of ["wordmark", "symbol", "shapes"] as const) {
        const design = {
          ...DEFAULT_DESIGN,
          gradient: { ...DEFAULT_GRADIENT, type },
        };
        const svg = serializeSvg(design, mode, "#2563eb");
        expect(svg).toContain(`<${type}Gradient`);
        expect(svg).toContain('mask="url(#paint-mask)"');
        expect(svg).toContain('stop-color="#a855f7"');
        expect(svg).not.toMatch(/NaN|Infinity|currentColor|var\(/);
        expect(buildDrawing(design)).toEqual(buildDrawing(DEFAULT_DESIGN));
        expect(validateDesign(design).gradient?.stops).toHaveLength(2);
      }
    expect(
      validateDesign({
        ...DEFAULT_DESIGN,
        gradient: {
          ...DEFAULT_GRADIENT,
          stops: [
            { color: "url(evil)", position: 0 },
            { color: "#ffffff", position: 1 },
          ],
        },
      }).gradient,
    ).toBeUndefined();
  });
  it("constructs a real vector glyph for the complete alphabet and digits in every family", () => {
    for (const family of FAMILIES)
      for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-+") {
        const marks = glyphMarks(char, {
          ...DEFAULT_DESIGN,
          ...PRESETS[family],
        });
        expect(marks.some((mark) => !mark.cutout)).toBe(true);
        expect(JSON.stringify(marks)).not.toMatch(/NaN|Infinity|undefined/);
      }
  });
  it("provides four distinct vector constructions for each letter", () => {
    for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
      const variants = [0, 1, 2, 3].map((v) =>
        JSON.stringify(glyphMarks(char, DEFAULT_DESIGN, v)),
      );
      expect(new Set(variants).size, char).toBe(4);
    }
  });
  it("keeps viewboxes finite and positive for long words and every slider extreme", () => {
    for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[])
      for (const value of LIMITS[key]) {
        const drawing = buildDrawing({
          ...DEFAULT_DESIGN,
          [key]: value,
          text: "MWI PLINKA 01234567",
        });
        expect(drawing.width).toBeGreaterThan(0);
        expect(drawing.height).toBeGreaterThan(0);
        expect(JSON.stringify(drawing)).not.toMatch(/NaN|Infinity/);
      }
  });
  it("changes curved geometry continuously when rounding changes", () => {
    const a = glyphMarks("P", { ...DEFAULT_DESIGN, roundness: 70 });
    const b = glyphMarks("P", { ...DEFAULT_DESIGN, roundness: 71 });
    expect(a[0].d).not.toBe(b[0].d);
  });
  it("exports standalone SVG with transparent masks and no font or external dependencies", () => {
    for (const mode of ["wordmark", "symbol", "shapes"] as const) {
      const svg = serializeSvg(
        { ...DEFAULT_DESIGN, cutouts: 90 },
        mode,
        "#2563eb",
      );
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain("<mask");
      expect(svg).not.toMatch(
        /<text|<image|<script|var\(|currentColor|https?:\/\/(?!www.w3.org)/,
      );
      expect(svg).not.toMatch(/NaN|Infinity/);
    }
  });
  it("escapes user text and rejects color injection", () => {
    expect(
      serializeSvg(
        { ...DEFAULT_DESIGN, text: "<script>" },
        "wordmark",
        "#171717",
      ),
    ).toContain("&lt;script&gt;");
    expect(() =>
      serializeSvg(DEFAULT_DESIGN, "wordmark", 'red" onload="alert(1)'),
    ).toThrow();
  });
  it("has valid closed geometry for all six editable primitives", () => {
    for (const kind of SHAPE_KINDS) {
      const d = shapePath({ ...DEFAULT_DESIGN.shapes[0], kind });
      expect(d).toMatch(/^M/);
      expect(d).toMatch(/Z$/);
      expect(d).not.toMatch(/NaN|Infinity/);
    }
  });
  it("generates repeatable compositions and varies their construction across seeds", () => {
    expect(generateComposition(42)).toEqual(generateComposition(42));
    const recipes = new Set(
      Array.from({ length: 30 }, (_, i) =>
        JSON.stringify(generateComposition(i)),
      ),
    );
    expect(recipes.size).toBe(30);
  });
  it("normalizes text and validates untrusted stored documents", () => {
    expect(normalizeText("Plínka <>& / é")).toBe("PLINKA   E");
    const design = validateDesign({
      text: "p".repeat(50),
      weight: 999,
      slant: NaN,
      color: "url(evil)",
      shapes: [
        null,
        { kind: "script" },
        { ...DEFAULT_DESIGN.shapes[0], width: -90, x: Infinity },
      ],
    });
    expect(design.text).toHaveLength(18);
    expect(design.weight).toBe(34);
    expect(design.slant).toBe(-8);
    expect(design.color).toBe("auto");
    expect(design.shapes).toHaveLength(1);
    expect(design.shapes[0].width).toBe(12);
    expect(design.shapes[0].x).toBe(300);
  });
});

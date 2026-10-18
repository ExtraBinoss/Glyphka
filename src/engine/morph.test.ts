import { expect, it } from "vitest";
import { createPathMorph } from "./morph";
import { glyphMarks } from "./geometry";
import { DEFAULT_DESIGN } from "./model";

it("morphs horizontal and vertical segments into curves without missing coordinates", () => {
  const from = "M0 0H80V80H0Z";
  const to = "M0 0Q40 80 80 0L80 80Z";
  for (const [a, b] of [
    [from, to],
    [to, from],
  ]) {
    const morph = createPathMorph(a, b);
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9])
      expect(morph(t)).not.toMatch(/NaN|Infinity|undefined/);
    expect(morph(0)).toBe(a);
    expect(morph(1)).toBe(b);
  }
});

it("keeps intermediate paths finite while restoring a saved word", () => {
  const initial = "PLINKA",
    saved = "STUDIO";
  for (let i = 0; i < initial.length; i++) {
    const from = glyphMarks(initial[i], DEFAULT_DESIGN).filter(
      (mark) => !mark.cutout,
    );
    const to = glyphMarks(saved[i], DEFAULT_DESIGN).filter(
      (mark) => !mark.cutout,
    );
    for (let j = 0; j < Math.min(from.length, to.length); j++) {
      const morph = createPathMorph(from[j].d, to[j].d);
      for (const t of [0.1, 0.5, 0.9])
        expect(morph(t)).not.toMatch(/NaN|Infinity|undefined/);
    }
  }
});

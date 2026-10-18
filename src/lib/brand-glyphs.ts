import { glyphMarks, type Mark } from "@/engine/geometry";
import { DEFAULT_DESIGN, PRESETS, type Family } from "@/engine/model";

import { BRAND_DESIGN } from "./brand-design";

export type IntroFrame = { marks: Mark[]; roundness: number };
const variations: Family[] = [
  "ribbon",
  "fold",
  "orbital",
  "ribbon",
  "fold",
  "orbital",
  "ribbon",
];
const finalFamilies: Family[] = Array.from({ length: 7 }, () => "stencil");
const finalVariants = [0, 0, 0, 0, 0, 0, 0];
export const INTRO_LETTERS = "GLYPHKA".split("").map((char, index) => {
  const families: Family[] = [
    "modular",
    variations[index],
    "ribbon",
    finalFamilies[index],
  ];
  const frames = families.map((family, frame): IntroFrame => {
    const design = {
      ...DEFAULT_DESIGN,
      ...PRESETS[family],
      family,
      seed: frame === 3 ? BRAND_DESIGN.seed : 37 + index * 71,
      weight: frame === 3 ? BRAND_DESIGN.weight : frame === 1 ? 24 : 19,
      slant: 0,
      mutation: 0,
      cutouts:
        frame === 3 ? (PRESETS[family].cutouts ?? 0) : frame === 1 ? 20 : 0,
      roundness:
        frame === 3 ? (PRESETS[family].roundness ?? 90) : frame === 0 ? 0 : 90,
    };
    return {
      marks: glyphMarks(char, design, [0, 3, 2, finalVariants[index]][frame]),
      roundness: design.roundness,
    };
  });
  return {
    char,
    family: finalFamilies[index],
    variant: finalVariants[index],
    frames,
    positiveCount: Math.max(
      ...frames.map(({ marks }) => marks.filter((mark) => !mark.cutout).length),
    ),
    cutoutCount: Math.max(
      ...frames.map(({ marks }) => marks.filter((mark) => mark.cutout).length),
    ),
  };
});

import { DEFAULT_DESIGN, PRESETS, type Design } from "@/engine/model";

// One real Stencil design for the wordmark, favicon and sharing artwork.
export const BRAND_DESIGN: Design = {
  ...DEFAULT_DESIGN,
  ...PRESETS.stencil,
  text: "GLYPHKA",
  seed: 17,
  slant: 0,
  color: "#2563eb",
  gradient: null,
};

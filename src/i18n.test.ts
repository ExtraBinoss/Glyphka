import { describe, expect, it } from "vitest";
import { FAMILIES, SHAPE_KINDS } from "./engine/model";
import { translations } from "./i18n";

describe("translation catalogs", () => {
  it("keep French and English keys in sync with non-empty copy", () => {
    const frenchKeys = Object.keys(translations.fr).sort();
    const englishKeys = Object.keys(translations.en).sort();

    expect(englishKeys).toEqual(frenchKeys);
    for (const catalog of [translations.fr, translations.en]) {
      for (const [key, value] of Object.entries(catalog)) {
        expect(value.trim(), `${key} should have a translation`).not.toBe("");
      }
    }
  });

  it("cover every family and generated or basic shape label", () => {
    for (const key of [...FAMILIES, ...SHAPE_KINDS]) {
      expect(translations.fr[key], `French label for ${key}`).toBeTruthy();
      expect(translations.en[key], `English label for ${key}`).toBeTruthy();
    }
  });

  it("uses localized labels for presets, dice refresh, gradient points, and export", () => {
    expect(translations.fr.presets).toBe("Préréglages");
    expect(translations.fr.newDrawing).toBe("Autres dessins");
    expect(translations.en.newDrawing).toBe("More drawings");
    expect(translations.fr.gradientStops).toBe("Points du dégradé");
    expect(translations.fr.download).toBe("Export");
    expect(translations.en.download).toBe("Export");
  });
});

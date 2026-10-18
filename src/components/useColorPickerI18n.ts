import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
  ColorPickerColor,
  ColorPickerI18nOverrides,
} from "./ui/color-picker";
import { formatColor } from "./ui/color-picker";

function colorName(
  color: ColorPickerColor,
  t: (key: string) => string,
  french: boolean,
) {
  const match = formatColor(color, "hex").match(/^#([\da-f]{6})/i);
  if (!match) return "";
  const rgb = [0, 2, 4].map(
    (index) => Number.parseInt(match[1].slice(index, index + 2), 16) / 255,
  );
  const max = Math.max(...rgb),
    min = Math.min(...rgb);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  if (saturation < 0.12) {
    if (lightness < 0.2) return t("colorBlack");
    if (lightness < 0.45) return t("colorDarkGray");
    if (lightness < 0.75) return t("colorGray");
    return lightness < 0.95 ? t("colorLightGray") : t("colorWhite");
  }
  let hue = 0;
  if (delta !== 0) {
    if (max === rgb[0]) hue = 60 * (((rgb[1] - rgb[2]) / delta) % 6);
    else if (max === rgb[1]) hue = 60 * ((rgb[2] - rgb[0]) / delta + 2);
    else hue = 60 * ((rgb[0] - rgb[1]) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const key =
    hue < 15 || hue >= 345
      ? "colorPink"
      : hue < 45
        ? "colorRed"
        : hue < 80
          ? "colorOrange"
          : hue < 120
            ? "colorYellow"
            : hue < 135
              ? "colorLime"
              : hue < 165
                ? "colorGreen"
                : hue < 205
                  ? "colorCyan"
                  : hue < 250
                    ? "colorSkyBlue"
                    : hue < 280
                      ? "colorBlue"
                      : hue < 300
                        ? "colorViolet"
                        : hue < 320
                          ? "colorPurple"
                          : "colorMagenta";
  const name = t(key);
  const describe = (modifier: string) =>
    french ? `${name} ${modifier}` : `${modifier} ${name}`;
  if (lightness < 0.45) {
    if (hue >= 40 && hue < 100) return t("colorBrown");
    return describe(t("colorDark"));
  }
  if (lightness > 0.82) return describe(t("colorLight"));
  if (saturation < 0.28) return describe(t("colorGrayish"));
  if (saturation > 0.72) return describe(t("colorVibrant"));
  return name;
}

export function useColorPickerI18n(): ColorPickerI18nOverrides {
  const { t, i18n } = useTranslation();
  const french = (i18n.resolvedLanguage ?? i18n.language).startsWith("fr");
  return useMemo(
    () => ({
      labels: {
        placeholder: t("colorPlaceholder"),
        panelLabel: t("chooseColor"),
        openPicker: t("openColorPicker"),
        area: t("saturationBrightness"),
        hue: t("hue"),
        saturation: t("saturation"),
        brightness: t("brightness"),
        lightness: t("lightness"),
        chroma: t("chroma"),
        red: t("red"),
        green: t("green"),
        blue: t("blue"),
        alpha: t("opacity"),
        hex: t("hexColor"),
        format: t("colorFormat"),
        eyeDropper: t("pickColor"),
        copy: t("copyColor"),
        copied: t("colorCopied"),
        clear: t("clearColor"),
        swatches: t("swatches"),
      },
      functions: { getColorName: (color) => colorName(color, t, french) },
    }),
    [t, french],
  );
}

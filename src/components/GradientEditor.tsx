import { useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Root } from "./ui/amplo/parts/gradient/root";
import { Bar } from "./ui/amplo/parts/gradient/bar";
import {
  GradientPickerContext,
  useGradientPickerContext,
} from "./ui/amplo/contexts/gradient";
import { parseColor, formatColor } from "./ui/amplo/lib/color";
import type { Gradient } from "./ui/amplo/lib/gradient";
import { DEFAULT_GRADIENT } from "@/engine/paint";
import { commitPaintAtom, paintAtom, previewColorAtom } from "@/state/studio";
import { ColorPicker, ColorPickerPanel } from "./ui/color-picker";
import { Button } from "./ui/button";
import { PreferenceGroup } from "./PreferenceGroup";
import { RangeField } from "./RangeField";
import { ControlHint } from "./ControlHint";
import { useColorPickerI18n } from "./useColorPickerI18n";

function Controls() {
  const { t } = useTranslation(),
    ctx = useGradientPickerContext(),
    pickerI18n = useColorPickerI18n();
  const stop = ctx.selectedStop;
  return (
    <>
      <div className="gradient-type">
        <PreferenceGroup
          label={t("gradientType")}
          value={ctx.gradient.type}
          options={[
            { value: "linear", label: t("linear") },
            { value: "radial", label: t("radial") },
          ]}
          onChange={(value) => ctx.setType(value as "linear" | "radial")}
        />
      </div>
      <section className="gradient-stops" aria-label={t("gradientStops")}>
        <div className="gradient-section-heading">
          <span>{t("gradientStops")}</span>
          <span>{ctx.stops.length}</span>
        </div>
        <GradientPickerContext.Provider
          value={{
            ...ctx,
            removeStop: (id) => {
              if (ctx.stops.length > 2) ctx.removeStop(id);
            },
            addStop: (position, color) =>
              ctx.stops.length < 32
                ? ctx.addStop(position, color)
                : ctx.selectedStopId,
          }}
        >
          <Bar height={28} handleSize={18} aria-label={t("gradientStops")} />
        </GradientPickerContext.Provider>
        <Button
          variant="outline"
          size="sm"
          className="gradient-add-stop"
          aria-label={t("addStop")}
          disabled={ctx.stops.length >= 32}
          onClick={() => ctx.selectStop(ctx.addStop(0.5))}
        >
          <Plus />
          {t("addStop")}
        </Button>
      </section>
      <div className="gradient-angle">
        <RangeField
          label={t("angle")}
          value={ctx.gradient.type === "linear" ? ctx.gradient.angle : 0}
          min={0}
          max={360}
          unit="°"
          onChange={ctx.setAngle}
          disabled={ctx.gradient.type !== "linear"}
        />
      </div>
      {stop && (
        <section className="gradient-stop-editor" aria-label={t("stopColor")}>
          <div className="gradient-section-heading">
            <span className="gradient-selected-stop">
              <i style={{ backgroundColor: formatColor(stop.color, "hex") }} />
              {t("stopColor")}
            </span>
            <ControlHint label={t("removeStop")}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("removeStop")}
                disabled={ctx.stops.length <= 2}
                onClick={() => ctx.removeStop(ctx.selectedStopId)}
              >
                <Trash2 />
              </Button>
            </ControlHint>
          </div>
          <RangeField
            label={t("stopPosition")}
            value={stop.position * 100}
            min={0}
            max={100}
            unit="%"
            onChange={(value) => ctx.moveStop(stop.id, value / 100)}
          />
          <ColorPicker
            value={formatColor(stop.color, "hex")}
            format="hex"
            alpha={false}
            i18n={pickerI18n}
            onValueChange={(color) => {
              const parsed = color && parseColor(color);
              if (parsed) ctx.setStopColor(stop.id, parsed);
            }}
          >
            <ColorPickerPanel />
          </ColorPicker>
        </section>
      )}
    </>
  );
}

export function GradientEditor() {
  const paint = useAtomValue(paintAtom),
    preview = useSetAtom(previewColorAtom),
    commit = useSetAtom(commitPaintAtom);
  const fill = paint.gradient ?? DEFAULT_GRADIENT;
  const value = useMemo((): Gradient => {
    const stops = fill.stops.map((s) => ({
      ...s,
      color: parseColor(s.color)!,
    }));
    return fill.type === "linear"
      ? { type: "linear", angle: fill.angle, interp: "srgb", stops }
      : {
          type: "radial",
          center: { x: 0.5, y: 0.5 },
          shape: "ellipse",
          size: "farthest-corner",
          interp: "srgb",
          stops,
        };
  }, [fill]);
  return (
    <Root
      value={value}
      className="gradient-editor"
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) commit();
      }}
      onValueChange={(gradient) => {
        if (gradient.type === "conic") return;
        preview({
          color: paint.color,
          gradient: {
            type: gradient.type,
            angle: gradient.type === "linear" ? gradient.angle : fill.angle,
            stops: gradient.stops.map((s, index) => ({
              id: s.id ?? `stop-${index}`,
              color: formatColor(s.color, "hex"),
              position: s.position,
            })),
          },
        });
      }}
    >
      <Controls />
    </Root>
  );
}

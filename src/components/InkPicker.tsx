import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Check, Plus } from "lucide-react";
import {
  paintAtom,
  previewColorAtom,
  commitPaintAtom,
  editAtom,
  endGestureAtom,
} from "@/state/studio";
import { ColorPicker, ColorPickerPanel } from "./ui/color-picker";
import { Button } from "./ui/button";
import { GradientEditor } from "./GradientEditor";
import { DEFAULT_GRADIENT, gradientCss } from "@/engine/paint";
import { PreferenceGroup } from "./PreferenceGroup";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";

const COLORS = ["auto", "#2563eb", "#ff5a1f", "#a855f7", "#22a78b", "#f43f5e"];
export function InkPicker() {
  const design = useAtomValue(paintAtom),
    edit = useSetAtom(editAtom),
    preview = useSetAtom(previewColorAtom),
    commit = useSetAtom(commitPaintAtom),
    end = useSetAtom(endGestureAtom),
    { t, i18n } = useTranslation();
  const [custom, setCustom] = useState<string[]>(() => {
    try {
      const v: unknown = JSON.parse(
        localStorage.getItem("glyphka.palette") || "[]",
      );
      return Array.isArray(v)
        ? v
            .filter(
              (x): x is string =>
                typeof x === "string" && /^#[\da-f]{6}$/i.test(x),
            )
            .slice(0, 18)
        : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);
  const add = () => {
    commit();
    const color = design.color === "auto" ? "#2563eb" : design.color;
    if (![...COLORS, ...custom].includes(color)) {
      const next = [...custom, color].slice(-18);
      setCustom(next);
      try {
        localStorage.setItem("glyphka.palette", JSON.stringify(next));
      } catch {
        /* Editing still works. */
      }
    }
    setOpen(false);
    end();
  };
  const fr = i18n.language === "fr";
  return (
    <section className="panel-section color-section">
      <h3>{t("ink")}</h3>
      <PreferenceGroup
        label={t("fillType")}
        value={design.gradient ? "gradient" : "solid"}
        options={[
          { value: "solid", label: t("solidColor") },
          { value: "gradient", label: t("gradient") },
        ]}
        onChange={(value) => {
          preview({
            color: design.color,
            gradient:
              value === "gradient"
                ? (design.gradient ?? DEFAULT_GRADIENT)
                : null,
          });
          commit();
        }}
      />
      <AnimatePresence initial={false}>
        {design.gradient && (
          <m.div
            className="gradient-preview-row"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24 }}
          >
            <Popover
              onOpenChange={(open) => {
                if (!open) commit();
              }}
            >
              <PopoverTrigger
                render={
                  <button
                    className="gradient-swatch"
                    aria-label={t("editGradient")}
                  />
                }
                style={{ background: gradientCss(design.gradient) }}
              />
              <PopoverContent
                className="gradient-popover bg-popover/90 backdrop-blur-xl"
                side="left"
                align="end"
                collisionPadding={16}
              >
                <PopoverTitle>{t("gradient")}</PopoverTitle>
                <GradientEditor />
              </PopoverContent>
            </Popover>
          </m.div>
        )}
      </AnimatePresence>
      <div className="palette">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              commit();
              end();
            }
          }}
        >
          <PopoverTrigger
            render={
              <button className="custom-swatch" aria-label={t("custom")} />
            }
          >
            <Plus size={14} />
          </PopoverTrigger>
          <PopoverContent
            className="ink-popover bg-popover/80 backdrop-blur-xl"
            side="top"
            align="end"
            sideOffset={12}
            collisionPadding={16}
          >
            <PopoverTitle>{t("ink")}</PopoverTitle>
            <ColorPicker
              value={design.color === "auto" ? "#2563eb" : design.color}
              format="hex"
              alpha={false}
              onValueChange={(color) => {
                if (color && /^#[\da-f]{6}$/i.test(color)) {
                  preview({ color, gradient: null });
                }
              }}
              onValueCommit={() => {
                commit();
                end();
              }}
              i18n={{
                labels: {
                  panelLabel: t("custom"),
                  area: fr
                    ? "Saturation et luminosité"
                    : "Saturation and brightness",
                  hue: fr ? "Teinte" : "Hue",
                  hex: fr ? "Code hexadécimal" : "Hex color",
                  copy: fr ? "Copier la couleur" : "Copy color",
                  eyeDropper: fr ? "Prélever une couleur" : "Pick a color",
                },
              }}
            >
              <ColorPickerPanel />
            </ColorPicker>
            <Button size="sm" onClick={add}>
              <Plus />
              {fr ? "Ajouter à la palette" : "Add to palette"}
            </Button>
          </PopoverContent>
        </Popover>
        {[...COLORS, ...custom].map((color) => (
          <button
            key={color}
            className={`swatch ${design.color === color ? "active" : ""} ${color === "auto" ? "auto-swatch" : ""}`}
            style={color === "auto" ? undefined : { backgroundColor: color }}
            aria-label={color === "auto" ? t("auto") : color}
            title={color === "auto" ? t("auto") : color}
            aria-pressed={!design.gradient && design.color === color}
            onClick={() => {
              commit();
              edit({ color, gradient: null });
            }}
          >
            {design.color === color && <Check size={13} />}
          </button>
        ))}
      </div>
    </section>
  );
}

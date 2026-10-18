import { useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Plus } from "lucide-react";
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
import { ControlHint } from "./ControlHint";
import { useColorPickerI18n } from "./useColorPickerI18n";
import { addPaletteColorAtom, paletteAtom } from "@/state/palette";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./ui/dropdown-menu";
const COLORS = ["auto", "#2563eb", "#ff5a1f", "#a855f7", "#22a78b", "#f43f5e"];
export function InkPicker() {
  const pickerI18n = useColorPickerI18n();
  const design = useAtomValue(paintAtom),
    edit = useSetAtom(editAtom),
    preview = useSetAtom(previewColorAtom),
    commit = useSetAtom(commitPaintAtom),
    end = useSetAtom(endGestureAtom),
    { t } = useTranslation();
  const custom = useAtomValue(paletteAtom),
    addColor = useSetAtom(addPaletteColorAtom);
  const [open, setOpen] = useState(false),
    lastGradient = useRef(design.gradient ?? DEFAULT_GRADIENT);
  const solid = !design.gradient;
  const background = design.gradient
    ? gradientCss(design.gradient)
    : design.color === "auto"
      ? "var(--foreground)"
      : design.color;
  const add = () => {
    commit();
    const color = design.color === "auto" ? "#2563eb" : design.color;
    if (![...COLORS, ...custom].includes(color)) {
      addColor(color);
    }
    setOpen(false);
    end();
  };
  return (
    <section className="panel-section color-section">
      <h3>{t("ink")}</h3>
      <Popover
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            commit();
            end();
          }
        }}
      >
        <PopoverTrigger
          render={<Button variant="outline" className="fill-field" />}
          aria-label={solid ? t("custom") : t("editGradient")}
        >
          <span className="fill-chip" style={{ background }} />
          <span>
            {design.gradient
              ? t("gradient")
              : design.color === "auto"
                ? t("auto")
                : design.color.toUpperCase()}
          </span>
          <ChevronDown />
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="end"
          sideOffset={12}
          collisionPadding={16}
          className="fill-popover bg-popover/95 backdrop-blur-xl"
        >
          <div className="fill-picker-heading">
            <PopoverTitle>{t("ink")}</PopoverTitle>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" />}
                aria-label={t("fillType")}
              >
                {solid ? t("solidColor") : t("gradient")}
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover/95 backdrop-blur-xl"
              >
                <DropdownMenuRadioGroup
                  value={solid ? "solid" : "gradient"}
                  onValueChange={(value) => {
                    if (design.gradient) lastGradient.current = design.gradient;
                    preview({
                      color: design.color,
                      gradient:
                        value === "gradient"
                          ? (design.gradient ?? lastGradient.current)
                          : null,
                    });
                    commit();
                  }}
                >
                  <DropdownMenuRadioItem value="solid">
                    {t("solidColor")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="gradient">
                    {t("gradient")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={solid ? "solid" : "gradient"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {solid ? (
                <>
                  <ColorPicker
                    value={design.color === "auto" ? "#2563eb" : design.color}
                    format="hex"
                    alpha={false}
                    onValueChange={(color) => {
                      if (color && /^#[\da-f]{6}$/i.test(color))
                        preview({ color, gradient: null });
                    }}
                    onValueCommit={() => {
                      commit();
                      end();
                    }}
                    i18n={pickerI18n}
                  >
                    <ColorPickerPanel />
                  </ColorPicker>
                  <Button className="add-swatch" size="sm" onClick={add}>
                    <Plus />
                    {t("addToPalette")}
                  </Button>
                </>
              ) : (
                <GradientEditor />
              )}
            </m.div>
          </AnimatePresence>
        </PopoverContent>
        <div className="palette">
          <ControlHint label={t("custom")}>
            <PopoverTrigger
              render={
                <button
                  className="custom-swatch"
                  aria-label={t("openColorPicker")}
                />
              }
              aria-label={t("openColorPicker")}
            >
              <Plus size={14} />
            </PopoverTrigger>
          </ControlHint>
          {[...COLORS, ...custom].map((color) => (
            <button
              key={color}
              className={`swatch ${solid && design.color === color ? "active" : ""} ${color === "auto" ? "auto-swatch" : ""}`}
              style={color === "auto" ? undefined : { backgroundColor: color }}
              aria-label={color === "auto" ? t("auto") : color}
              title={color === "auto" ? t("auto") : color}
              aria-pressed={solid && design.color === color}
              onClick={() => {
                commit();
                edit({ color, gradient: null });
              }}
            >
              {solid && design.color === color && <Check size={13} />}
            </button>
          ))}
        </div>
      </Popover>
    </section>
  );
}

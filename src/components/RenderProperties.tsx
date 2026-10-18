import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import {
  beginGestureAtom,
  inspectorRenderSettingsAtom,
  previewRenderAtom,
  commitRenderAtom,
  endGestureAtom,
  threeApiAtom,
} from "@/state/studio";
import { DEFAULT_RENDER, type RenderSettings } from "@/engine/model";
import { RangeField } from "./RangeField";
import { ColorPicker, ColorPickerPanel } from "./ui/color-picker";
import { useColorPickerI18n } from "./useColorPickerI18n";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";
import { Button } from "./ui/button";
import { ButtonGroup } from "./ui/button-group";
import { AnimatePresence, m } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

function RenderColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const begin = useSetAtom(beginGestureAtom),
    end = useSetAtom(endGestureAtom),
    commit = useSetAtom(commitRenderAtom),
    pickerI18n = useColorPickerI18n();
  return (
    <div className="render-color">
      <span>{label}</span>
      <Popover
        onOpenChange={(open) => {
          if (!open) {
            commit();
            end();
          }
        }}
      >
        <PopoverTrigger
          render={<Button variant="outline" size="sm" />}
          aria-label={label}
        >
          <i style={{ backgroundColor: value }} />
          {value.toUpperCase()}
        </PopoverTrigger>
        <PopoverContent
          className="ink-popover bg-popover/80 backdrop-blur-xl"
          side="left"
          align="end"
          collisionPadding={14}
        >
          <PopoverTitle>{label}</PopoverTitle>
          <ColorPicker
            value={value}
            format="hex"
            alpha={false}
            i18n={pickerI18n}
            onValueChange={(color) => {
              if (color && /^#[\da-f]{6}$/i.test(color)) {
                begin();
                onChange(color);
              }
            }}
            onValueCommit={() => {
              commit();
              end();
            }}
          >
            <ColorPickerPanel />
          </ColorPicker>
        </PopoverContent>
      </Popover>
    </div>
  );
}
function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      className="toggle-row"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
    >
      <span>{label}</span>
      <span className={`toggle-track ${value ? "on" : ""}`}>
        <span />
      </span>
    </button>
  );
}
export function RenderProperties() {
  const { t } = useTranslation(),
    r = useAtomValue(inspectorRenderSettingsAtom),
    preview = useSetAtom(previewRenderAtom),
    commit = useSetAtom(commitRenderAtom),
    api = useAtomValue(threeApiAtom);
  const update = (patch: Partial<RenderSettings>) => {
    preview(patch);
    commit();
  };
  const field = (
    key: keyof RenderSettings,
    min: number,
    max: number,
    step = 1,
    unit = "",
  ) => (
    <RangeField
      key={key}
      label={t(key === "light" ? "lightIntensity" : key)}
      value={r[key] as number}
      min={min}
      max={max}
      step={step}
      unit={unit}
      initial={DEFAULT_RENDER[key] as number}
      onChange={(value) => preview({ [key]: value })}
      onCommit={() => commit()}
    />
  );
  return (
    <>
      <section className="panel-section">
        <div className="section-heading">
          <h3>{t("camera")}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              api?.reset();
              update({ rotationX: 0, rotationY: 0, rotationZ: 0 });
            }}
          >
            {t("reset")}
          </Button>
        </div>
        <ButtonGroup className="fill-group">
          <Button variant="secondary" size="sm" onClick={() => api?.front()}>
            {t("front")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => api?.perspective()}
          >
            {t("perspective")}
          </Button>
        </ButtonGroup>
        <ToggleRow
          label={t("autoRotate")}
          value={r.autoRotate}
          onChange={(autoRotate) => update({ autoRotate })}
        />
        <AnimatePresence initial={false}>
          {r.autoRotate && (
            <m.div
              layout="position"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: "hidden" }}
            >
              {field("autoRotateSpeed", 0.1, 5, 0.05, "×")}
            </m.div>
          )}
        </AnimatePresence>
        <p className="micro muted">{t("orbitHint")}</p>
      </section>
      <Accordion
        className="properties-accordion"
        multiple
        defaultValue={["volume", "material", "lighting"]}
      >
        <AccordionItem value="volume">
          <AccordionTrigger>{t("volume")}</AccordionTrigger>
          <AccordionContent>
            <div className="geometry-fields">
              {field("depth", 1, 100)}
              {field("bevel", 0, 5, 0.1)}
              {field("rotationX", -180, 180, 1, "°")}
              {field("rotationY", -180, 180, 1, "°")}
              {field("rotationZ", -180, 180, 1, "°")}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="material">
          <AccordionTrigger>{t("material")}</AccordionTrigger>
          <AccordionContent>
            <div className="geometry-fields">
              {field("roughness", 0, 1, 0.01)}
              {field("metalness", 0, 1, 0.01)}
              <div className="material-presets">
                {[
                  ["clay", 0.85, 0],
                  ["plastic", 0.25, 0.12],
                  ["metal", 0.18, 0.92],
                ].map(([name, roughness, metalness]) => (
                  <Button
                    key={name}
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      update({
                        roughness: roughness as number,
                        metalness: metalness as number,
                      })
                    }
                  >
                    {t(name as string)}
                  </Button>
                ))}
              </div>
              <ToggleRow
                label={t("separateSide")}
                value={r.separateSide}
                onChange={(separateSide) => update({ separateSide })}
              />
              {r.separateSide && (
                <RenderColor
                  label={t("sideColor")}
                  value={r.sideColor}
                  onChange={(sideColor) => preview({ sideColor })}
                />
              )}
              {field("outline", 0, 5, 0.1)}
              <RenderColor
                label={t("outlineColor")}
                value={r.outlineColor}
                onChange={(outlineColor) => preview({ outlineColor })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="lighting">
          <AccordionTrigger>{t("lighting")}</AccordionTrigger>
          <AccordionContent>
            <div className="geometry-fields">
              {field("light", 0.2, 8, 0.1)}
              {field("lightAngle", -180, 180, 1, "°")}
              {field("lightHeight", 1, 12, 0.1)}
              {field("shadow", 0, 0.8, 0.01)}
              {field("shadowSoftness", 0, 12, 0.5)}
              {field("elevation", 0, 1.5, 0.01)}
              <ToggleRow
                label={t("transparent")}
                value={r.transparent}
                onChange={(transparent) => update({ transparent })}
              />
              {!r.transparent && (
                <RenderColor
                  label={t("background")}
                  value={r.background}
                  onChange={(background) => preview({ background })}
                />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}

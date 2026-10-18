import { startTransition, useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Save, Plus, Trash2, Check } from "lucide-react";
import {
  presetsAtom,
  savePresetAtom,
  deletePresetAtom,
  loadPresetAtom,
  PRESET_LIMIT,
  activePresetIdAtom,
  previewPresetAtom,
} from "@/state/presets";
import { preloadThree } from "@/lib/preload-three";
import { buildMesh } from "@/engine/mesh-service";
import { serializeSvg } from "@/engine/geometry";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ControlHint } from "./ControlHint";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
} from "./ui/popover";

export function PresetControls() {
  const { t } = useTranslation(),
    presets = useAtomValue(presetsAtom),
    active = useAtomValue(activePresetIdAtom),
    save = useSetAtom(savePresetAtom),
    remove = useSetAtom(deletePresetAtom),
    load = useSetAtom(loadPresetAtom),
    preview = useSetAtom(previewPresetAtom);
  const [name, setName] = useState(""),
    [open, setOpen] = useState(false);
  const thumbnails = useMemo(
    () =>
      presets.map((preset) => ({
        preset,
        src: `data:image/svg+xml,${encodeURIComponent(serializeSvg(preset.design, preset.mode, preset.design.color === "auto" ? "#202124" : preset.design.color, preset.selected))}`,
      })),
    [presets],
  );
  useEffect(() => {
    if (!open || !presets.some((preset) => preset.view === "3d")) return;
    startTransition(preloadThree);
    for (const preset of presets)
      if (preset.view === "3d")
        void buildMesh(
          preset.design,
          preset.mode,
          preset.selected,
          false,
        ).catch(() => {});
  }, [open, presets]);
  useEffect(() => () => preview(null), [preview]);
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) preview(null);
      }}
    >
      <ControlHint label={t("presets")}>
        <PopoverTrigger
          render={<Button variant="ghost" size="icon-sm" />}
          aria-label={t("presets")}
        >
          <Save />
        </PopoverTrigger>
      </ControlHint>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="preset-popover bg-popover/95 backdrop-blur-xl"
      >
        <div className="preset-heading">
          <PopoverTitle>{t("presets")}</PopoverTitle>
          <span>
            {presets.length}/{PRESET_LIMIT}
          </span>
        </div>
        <div className="preset-save">
          <Input
            aria-label={t("presetName")}
            placeholder={t("presetName")}
            value={name}
            maxLength={40}
            onFocus={() => preview(null)}
            onChange={(e) => {
              preview(null);
              setName(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" && save(name)) setName("");
            }}
          />
          <Button
            size="icon-sm"
            aria-label={t("savePreset")}
            disabled={presets.length >= PRESET_LIMIT}
            onClick={() => {
              if (save(name)) setName("");
            }}
          >
            <Plus />
          </Button>
        </div>
        <div
          className="preset-list"
          onPointerLeave={() => preview(null)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              preview(null);
          }}
        >
          {thumbnails.map(({ preset: p, src }) => (
            <div
              className="preset-row"
              data-active={active === p.id}
              key={p.id}
            >
              <button
                className="preset-load"
                aria-pressed={active === p.id}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") preview(p);
                }}
                onFocus={() => preview(p)}
                onClick={() => {
                  load(p);
                  setOpen(false);
                }}
                aria-label={`${t("loadPreset")} ${p.name}`}
              >
                <img
                  alt=""
                  src={src}
                  className={
                    p.design.color === "auto" && !p.design.gradient
                      ? "preset-auto-ink"
                      : undefined
                  }
                />
                <span>{p.name}</span>
                <Check className="preset-check" size={14} aria-hidden="true" />
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`${t("deletePreset")} ${p.name}`}
                onPointerEnter={() => preview(null)}
                onFocus={() => preview(null)}
                onClick={() => {
                  preview(null);
                  remove(p.id);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

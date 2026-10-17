import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Save, Plus, Trash2 } from "lucide-react";
import {
  presetsAtom,
  savePresetAtom,
  deletePresetAtom,
  loadPresetAtom,
  PRESET_LIMIT,
} from "@/state/presets";
import { previewDesignAtom } from "@/state/studio";
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
    save = useSetAtom(savePresetAtom),
    remove = useSetAtom(deletePresetAtom),
    load = useSetAtom(loadPresetAtom),
    preview = useSetAtom(previewDesignAtom);
  const [name, setName] = useState(""),
    [open, setOpen] = useState(false);
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
            onChange={(e) => setName(e.target.value)}
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
        <div className="preset-list">
          {presets.map((p) => (
            <div className="preset-row" key={p.id}>
              <button
                className="preset-load"
                onClick={() => {
                  load(p);
                  setOpen(false);
                }}
                aria-label={`${t("loadPreset")} ${p.name}`}
              >
                <img
                  alt=""
                  src={`data:image/svg+xml,${encodeURIComponent(serializeSvg(p.design, p.mode, p.design.color === "auto" ? "#2563eb" : p.design.color, p.selected))}`}
                />
                <span>{p.name}</span>
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`${t("deletePreset")} ${p.name}`}
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

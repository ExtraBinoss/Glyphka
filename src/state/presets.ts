import { atom } from "jotai";
import { validateDesign, type Design, type Mode } from "@/engine/model";
import {
  commitPaintAtom,
  designAtom,
  editAtom,
  modeAtom,
  previewDesignAtom,
  selectedGlyphAtom,
  selectedShapeAtom,
  viewAtom,
} from "./studio";

export const PRESET_LIMIT = 5;
export interface SavedPreset {
  id: string;
  name: string;
  design: Design;
  mode: Exclude<Mode, "about">;
  view: "2d" | "3d";
  selected: number;
}
const STORAGE = "glyphka.presets.v1";
export function validatePresets(value: unknown): SavedPreset[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, PRESET_LIMIT).flatMap((raw, i) => {
    if (!raw || typeof raw !== "object" || typeof raw.name !== "string")
      return [];
    try {
      return [
        {
          id: typeof raw.id === "string" ? raw.id.slice(0, 80) : `preset-${i}`,
          name: raw.name.trim().slice(0, 40) || `Preset ${i + 1}`,
          design: validateDesign(raw.design),
          mode:
            raw.mode === "shapes" || raw.mode === "symbol"
              ? raw.mode
              : "wordmark",
          view: raw.view === "3d" ? "3d" : "2d",
          selected:
            typeof raw.selected === "number" && Number.isFinite(raw.selected)
              ? Math.max(0, Math.min(17, Math.round(raw.selected)))
              : 0,
        } satisfies SavedPreset,
      ];
    } catch {
      return [];
    }
  });
}
function load() {
  try {
    return validatePresets(JSON.parse(localStorage.getItem(STORAGE) || "[]"));
  } catch {
    return [];
  }
}
export const presetsAtom = atom<SavedPreset[]>(load());
function persist(presets: SavedPreset[]) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(presets));
  } catch {
    /* Presets remain usable for this session. */
  }
}
export const savePresetAtom = atom(null, (get, set, name: string) => {
  const presets = get(presetsAtom);
  if (presets.length >= PRESET_LIMIT) return false;
  set(commitPaintAtom);
  const mode = get(modeAtom);
  const next = [
    ...presets,
    {
      id: crypto.randomUUID(),
      name:
        name.trim().slice(0, 40) ||
        get(designAtom).text ||
        `Preset ${presets.length + 1}`,
      design: structuredClone(get(designAtom)),
      mode: mode === "about" ? "wordmark" : mode,
      view: get(viewAtom),
      selected: get(selectedGlyphAtom),
    },
  ];
  set(presetsAtom, next);
  persist(next);
  return true;
});
export const deletePresetAtom = atom(null, (get, set, id: string) => {
  const next = get(presetsAtom).filter((p) => p.id !== id);
  set(presetsAtom, next);
  persist(next);
});
export const loadPresetAtom = atom(null, (_get, set, preset: SavedPreset) => {
  set(commitPaintAtom);
  set(previewDesignAtom, null);
  set(editAtom, structuredClone(preset.design));
  set(modeAtom, preset.mode);
  set(viewAtom, preset.view);
  set(selectedGlyphAtom, preset.selected);
  set(selectedShapeAtom, null);
});

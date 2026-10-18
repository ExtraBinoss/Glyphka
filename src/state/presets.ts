import { atom, getDefaultStore } from "jotai";
import { validateDesign, type Design, type Mode } from "@/engine/model";
import {
  commitPaintAtom,
  designAtom,
  editAtom,
  modeAtom,
  previewDesignAtom,
  previewSceneAtom,
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
const ACTIVE_STORAGE = "glyphka.preset.active.v1";
const preferredPresetIdAtom = atom<string | null>(null);
const recentPresetIdsAtom = atom<string[]>([]);
const designKeys = new WeakMap<Design, string>();
function designKey(design: Design) {
  let key = designKeys.get(design);
  if (key === undefined) {
    key = JSON.stringify(validateDesign(design));
    designKeys.set(design, key);
  }
  return key;
}
// Preview frames never invalidate this atom. Only committed edits can change selection.
export const activePresetIdAtom = atom((get) => {
  const presets = get(presetsAtom);
  if (!presets.length) return null;
  const key = designKey(get(designAtom));
  const mode = get(modeAtom),
    view = get(viewAtom),
    selected = get(selectedGlyphAtom);
  const matches = (preset: SavedPreset) =>
    preset.mode === mode &&
    preset.view === view &&
    (mode !== "symbol" || preset.selected === selected) &&
    designKey(preset.design) === key;
  const preferred = presets.find(
    (preset) => preset.id === get(preferredPresetIdAtom),
  );
  if (preferred && matches(preferred)) return preferred.id;
  for (const id of [...get(recentPresetIdsAtom)].reverse()) {
    const preset = presets.find((item) => item.id === id);
    if (preset && matches(preset)) return id;
  }
  return presets.find(matches)?.id ?? null;
});
function persistActive(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_STORAGE, id);
    else localStorage.removeItem(ACTIVE_STORAGE);
  } catch {
    /* Optional persistence. */
  }
}
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
const initialPresets: SavedPreset[] = [];
export const presetsAtom = atom<SavedPreset[]>(initialPresets);
const storageRestoredAtom = atom(false);
const restorePresetsAtom = atom(null, (get, set) => {
  if (get(storageRestoredAtom)) return;
  set(storageRestoredAtom, true);
  if (get(presetsAtom) === initialPresets) set(presetsAtom, load());
  try {
    set(preferredPresetIdAtom, localStorage.getItem(ACTIVE_STORAGE));
  } catch {
    /* Optional persistence. */
  }
});
export function restorePresetsFromStorage(store = getDefaultStore()) {
  store.set(restorePresetsAtom);
}
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
  const current = get(activePresetIdAtom);
  if (current)
    set(recentPresetIdsAtom, (ids) =>
      [...ids.filter((id) => id !== current), current].slice(-PRESET_LIMIT),
    );
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
  set(preferredPresetIdAtom, next.at(-1)!.id);
  persistActive(next.at(-1)!.id);
  persist(next);
  return true;
});
export const deletePresetAtom = atom(null, (get, set, id: string) => {
  const next = get(presetsAtom).filter((p) => p.id !== id);
  set(presetsAtom, next);
  if (get(preferredPresetIdAtom) === id) {
    set(preferredPresetIdAtom, null);
    persistActive(null);
  }
  persist(next);
});
export const loadPresetAtom = atom(null, (get, set, preset: SavedPreset) => {
  const current = get(activePresetIdAtom);
  if (current)
    set(recentPresetIdsAtom, (ids) =>
      [...ids.filter((id) => id !== current), current].slice(-PRESET_LIMIT),
    );
  set(commitPaintAtom);
  set(previewDesignAtom, null);
  // Documents are immutable. Reuse the already previewed snapshot and its geometry caches.
  set(editAtom, preset.design);
  set(modeAtom, preset.mode);
  set(viewAtom, preset.view);
  set(selectedGlyphAtom, preset.selected);
  set(selectedShapeAtom, null);
  set(preferredPresetIdAtom, preset.id);
  persistActive(preset.id);
});
export const previewPresetAtom = atom(
  null,
  (_get, set, preset: SavedPreset | null) => {
    set(previewSceneAtom, preset);
  },
);

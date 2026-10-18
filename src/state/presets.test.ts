import { createStore } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_DESIGN } from "@/engine/model";
import {
  activePresetIdAtom,
  previewPresetAtom,
  savePresetAtom,
  presetsAtom,
  loadPresetAtom,
  deletePresetAtom,
  validatePresets,
  restorePresetsFromStorage,
} from "./presets";
import {
  canUndoAtom,
  designAtom,
  editAtom,
  modeAtom,
  undoAtom,
  viewAtom,
  selectedGlyphAtom,
  previewSceneAtom,
  renderDesignAtom,
  canvasModeAtom,
  canvasViewAtom,
  canvasSelectedGlyphAtom,
  inspectorDesignAtom,
} from "./studio";

afterEach(() => vi.unstubAllGlobals());

it("keeps five independent presets, loads one undoably, and frees a deleted slot", () => {
  const store = createStore();
  for (let i = 0; i < 5; i++) {
    store.set(editAtom, { weight: 20 + i });
    expect(store.set(savePresetAtom, `Version ${i + 1}`)).toBe(true);
  }
  expect(store.set(savePresetAtom, "Overflow")).toBe(false);
  expect(store.get(presetsAtom)).toHaveLength(5);
  const first = store.get(presetsAtom)[0];
  expect(first.design.weight).toBe(20);
  store.set(modeAtom, "shapes");
  store.set(viewAtom, "3d");
  store.set(loadPresetAtom, first);
  expect(store.get(designAtom).weight).toBe(20);
  expect(store.get(modeAtom)).toBe("wordmark");
  expect(store.get(viewAtom)).toBe("2d");
  store.set(undoAtom);
  expect(store.get(designAtom).weight).toBe(24);
  store.set(deletePresetAtom, first.id);
  expect(store.get(presetsAtom)).toHaveLength(4);
  expect(store.set(savePresetAtom, "New")).toBe(true);
  expect(validatePresets([...store.get(presetsAtom), first])).toHaveLength(5);
  expect(validatePresets([null, {}, { name: "Bad", design: null }])).toEqual(
    [],
  );
});

it("restores saved presets once after hydration without selecting, saving or editing one", () => {
  const storage = {
    getItem: vi.fn(() =>
      JSON.stringify([
        {
          id: "saved",
          name: "Saved",
          design: { ...DEFAULT_DESIGN, text: "RESTORED" },
          mode: "symbol",
          view: "3d",
          selected: 2,
        },
      ]),
    ),
    setItem: vi.fn(),
  };
  vi.stubGlobal("localStorage", storage);
  const store = createStore();
  expect(store.get(presetsAtom)).toEqual([]);
  restorePresetsFromStorage(store);
  restorePresetsFromStorage(store);
  expect(store.get(presetsAtom)[0].design.text).toBe("RESTORED");
  expect(store.get(designAtom)).toEqual(DEFAULT_DESIGN);
  expect(store.get(modeAtom)).toBe("wordmark");
  expect(store.get(viewAtom)).toBe("2d");
  expect(store.get(canUndoAtom)).toBe(false);
  expect(storage.getItem).toHaveBeenCalledTimes(2);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it("identifies the chosen duplicate, clears on edits and follows undo without hover changing selection", () => {
  const store = createStore();
  store.set(savePresetAtom, "First");
  store.set(savePresetAtom, "Same drawing");
  const [first, second] = store.get(presetsAtom);
  expect(store.get(activePresetIdAtom)).toBe(second.id);
  store.set(loadPresetAtom, first);
  expect(store.get(activePresetIdAtom)).toBe(first.id);
  const changes = vi.fn();
  const unsubscribe = store.sub(activePresetIdAtom, changes);
  for (let seed = 0; seed < 50; seed++)
    store.set(previewPresetAtom, {
      ...second,
      design: { ...second.design, seed },
    });
  expect(store.get(activePresetIdAtom)).toBe(first.id);
  expect(changes).not.toHaveBeenCalled();
  store.set(previewPresetAtom, null);
  store.set(editAtom, { color: "#f01abc" });
  expect(store.get(activePresetIdAtom)).toBeNull();
  expect(first.design.color).toBe("auto");
  store.set(undoAtom);
  expect(store.get(activePresetIdAtom)).toBe(first.id);
  store.set(deletePresetAtom, first.id);
  expect(store.get(activePresetIdAtom)).toBe(second.id);
  unsubscribe();
});

it("previews all scene settings without touching the document, inspector, history or saved selection", () => {
  const store = createStore();
  store.set(savePresetAtom, "Base");
  const active = store.get(activePresetIdAtom);
  const initial = store.get(designAtom);
  const preset = {
    ...store.get(presetsAtom)[0],
    mode: "symbol" as const,
    view: "3d" as const,
    selected: 3,
    design: { ...initial, text: "OTHER", color: "#123456" },
  };
  store.set(previewPresetAtom, preset);
  expect(store.get(renderDesignAtom)).toBe(preset.design);
  expect(store.get(canvasModeAtom)).toBe("symbol");
  expect(store.get(canvasViewAtom)).toBe("3d");
  expect(store.get(canvasSelectedGlyphAtom)).toBe(3);
  expect(store.get(modeAtom)).toBe("wordmark");
  expect(store.get(viewAtom)).toBe("2d");
  expect(store.get(selectedGlyphAtom)).toBe(0);
  expect(store.get(inspectorDesignAtom)).toBe(initial);
  expect(store.get(activePresetIdAtom)).toBe(active);
  expect(store.get(canUndoAtom)).toBe(false);
  store.set(previewPresetAtom, null);
  expect(store.get(renderDesignAtom)).toBe(initial);
  expect(store.get(canvasModeAtom)).toBe("wordmark");
  expect(store.get(canvasViewAtom)).toBe("2d");
  store.set(previewPresetAtom, preset);
  store.set(editAtom, { weight: 30 });
  expect(store.get(previewSceneAtom)).toBeNull();
  expect(store.get(canvasModeAtom)).toBe("wordmark");
});

it("restores the preferred duplicate by id and does not mark a changed design as saved", () => {
  const saved = [
    {
      id: "one",
      name: "One",
      design: DEFAULT_DESIGN,
      mode: "wordmark",
      view: "2d",
    },
    {
      id: "two",
      name: "Two",
      design: DEFAULT_DESIGN,
      mode: "wordmark",
      view: "2d",
    },
  ];
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "glyphka.presets.v1" ? JSON.stringify(saved) : "two",
    setItem: vi.fn(),
  });
  const store = createStore();
  restorePresetsFromStorage(store);
  expect(store.get(activePresetIdAtom)).toBe("two");
  store.set(editAtom, { text: "UNSAVED" });
  expect(store.get(activePresetIdAtom)).toBeNull();
});

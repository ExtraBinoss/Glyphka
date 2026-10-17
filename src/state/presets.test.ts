import { createStore } from "jotai";
import { expect, it } from "vitest";
import {
  savePresetAtom,
  presetsAtom,
  loadPresetAtom,
  deletePresetAtom,
  validatePresets,
} from "./presets";
import { designAtom, editAtom, modeAtom, undoAtom, viewAtom } from "./studio";

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

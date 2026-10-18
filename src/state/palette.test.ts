import { createStore } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import {
  addPaletteColorAtom,
  paletteAtom,
  restorePaletteFromStorage,
  validatePalette,
} from "./palette";

afterEach(() => vi.unstubAllGlobals());

it("restores custom colors after the deterministic empty palette without writing them", () => {
  const storage = {
    getItem: vi.fn(() => '["#123456","bad","#123456","#abcdef"]'),
    setItem: vi.fn(),
  };
  vi.stubGlobal("localStorage", storage);
  const store = createStore();
  expect(store.get(paletteAtom)).toEqual([]);
  restorePaletteFromStorage(store);
  restorePaletteFromStorage(store);
  expect(store.get(paletteAtom)).toEqual(["#123456", "#abcdef"]);
  expect(storage.getItem).toHaveBeenCalledTimes(1);
  expect(storage.setItem).not.toHaveBeenCalled();
  store.set(addPaletteColorAtom, "#ff5a1f");
  expect(store.get(paletteAtom)).toContain("#ff5a1f");
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});

it("limits validated palettes and keeps editing available without storage", () => {
  expect(validatePalette(null)).toEqual([]);
  expect(
    validatePalette(Array.from({ length: 30 }, (_, i) => `#0000${i + 10}`)),
  ).toHaveLength(18);
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("unavailable");
    },
    setItem: () => {
      throw new Error("unavailable");
    },
  });
  const store = createStore();
  restorePaletteFromStorage(store);
  store.set(addPaletteColorAtom, "#123456");
  expect(store.get(paletteAtom)).toEqual(["#123456"]);
});

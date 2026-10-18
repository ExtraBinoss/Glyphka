import { atom, getDefaultStore } from "jotai";

const STORAGE = "glyphka.palette";
const initialPalette: string[] = [];
export const paletteAtom = atom<string[]>(initialPalette);
const storageRestoredAtom = atom(false);

export function validatePalette(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (color): color is string =>
          typeof color === "string" && /^#[\da-f]{6}$/i.test(color),
      ),
    ),
  ].slice(0, 18);
}

const restorePaletteAtom = atom(null, (get, set) => {
  if (get(storageRestoredAtom)) return;
  set(storageRestoredAtom, true);
  if (get(paletteAtom) !== initialPalette) return;
  try {
    set(
      paletteAtom,
      validatePalette(JSON.parse(localStorage.getItem(STORAGE) || "[]")),
    );
  } catch {
    // The default palette remains usable when storage is unavailable.
  }
});

export function restorePaletteFromStorage(store = getDefaultStore()) {
  store.set(restorePaletteAtom);
}

export const addPaletteColorAtom = atom(null, (get, set, color: string) => {
  const current = get(paletteAtom);
  if (!/^#[\da-f]{6}$/i.test(color) || current.includes(color)) return;
  const next = [...current, color].slice(-18);
  set(paletteAtom, next);
  try {
    localStorage.setItem(STORAGE, JSON.stringify(next));
  } catch {
    // Custom colors remain available during this session.
  }
});

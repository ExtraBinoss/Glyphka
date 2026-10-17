import { atom } from "jotai";
import {
  DEFAULT_DESIGN,
  validateDesign,
  type Design,
  type Mode,
  type GradientFill,
} from "@/engine/model";

const STORAGE = "glyphka.design.v1";
function load(): Design {
  try {
    const saved =
      localStorage.getItem(STORAGE) ??
      localStorage.getItem("glyphlab.design.v1");
    return saved
      ? validateDesign(JSON.parse(saved))
      : structuredClone(DEFAULT_DESIGN);
  } catch {
    return structuredClone(DEFAULT_DESIGN);
  }
}
interface History {
  past: Design[];
  present: Design;
  future: Design[];
}
const historyAtom = atom<History>({ past: [], present: load(), future: [] });
export const designAtom = atom((get) => get(historyAtom).present);
export interface Paint {
  color: string;
  gradient?: GradientFill | null;
}
const previewPaintAtom = atom<Paint | null>(null);
export const paintAtom = atom(
  (get): Paint => get(previewPaintAtom) ?? get(designAtom),
);
export const previewColorAtom = atom(null, (_get, set, paint: Paint) => {
  set(previewPaintAtom, paint);
});
export const commitPaintAtom = atom(null, (get, set) => {
  const paint = get(previewPaintAtom);
  if (!paint) return;
  set(editAtom, { color: paint.color, gradient: paint.gradient ?? null });
  set(previewPaintAtom, null);
});
export const modeAtom = atom<Mode>("wordmark");
export const selectedGlyphAtom = atom(0);
export const selectedShapeAtom = atom<string | null>(null);
export const guidesAtom = atom(false);
export const zoomAtom = atom(100);
export const viewAtom = atom<"2d" | "3d">("2d");
export interface ThreeApi {
  png: () => Promise<Blob>;
  reset: () => void;
  front: () => void;
  perspective: () => void;
  zoom: (percent: number) => void;
}
export const threeApiAtom = atom<ThreeApi | null>(null);
export const canUndoAtom = atom((get) => get(historyAtom).past.length > 0);
export const canRedoAtom = atom((get) => get(historyAtom).future.length > 0);
const save = (design: Design) => {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(design));
  } catch {
    /* Editing remains available when storage is unavailable. */
  }
};
// A gesture is a single history entry, even when it produces hundreds of live frames.
let gestureStart: Design | null = null;
export const beginGestureAtom = atom(null, (get) => {
  if (!gestureStart) gestureStart = get(designAtom);
});
export const editAtom = atom(
  null,
  (get, set, patch: Partial<Design> | ((design: Design) => Design)) => {
    const h = get(historyAtom),
      next =
        typeof patch === "function"
          ? patch(h.present)
          : { ...h.present, ...patch };
    if (JSON.stringify(next) === JSON.stringify(h.present)) return;
    set(historyAtom, {
      past: gestureStart ? h.past : [...h.past, h.present].slice(-80),
      present: next,
      future: [],
    });
    // Disk writes are debounced; the live SVG never waits for storage.
    scheduleSave(next);
  },
);
let saveTimer: ReturnType<typeof setTimeout>;
function scheduleSave(design: Design) {
  lastDesign = design;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(design), 250);
}
if (typeof window !== "undefined")
  window.addEventListener("pagehide", () => {
    const current = lastDesign;
    if (current) save(current);
  });
let lastDesign: Design | null = null;
export const endGestureAtom = atom(null, (get, set) => {
  if (!gestureStart) return;
  const h = get(historyAtom);
  if (JSON.stringify(gestureStart) !== JSON.stringify(h.present))
    set(historyAtom, { ...h, past: [...h.past, gestureStart].slice(-80) });
  gestureStart = null;
  lastDesign = get(designAtom);
});
export const undoAtom = atom(null, (get, set) => {
  set(previewPaintAtom, null);
  gestureStart = null;
  const h = get(historyAtom),
    previous = h.past.at(-1);
  if (!previous) return;
  set(historyAtom, {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future].slice(0, 80),
  });
  scheduleSave(previous);
});
export const redoAtom = atom(null, (get, set) => {
  set(previewPaintAtom, null);
  gestureStart = null;
  const h = get(historyAtom),
    next = h.future[0];
  if (!next) return;
  set(historyAtom, {
    past: [...h.past, h.present].slice(-80),
    present: next,
    future: h.future.slice(1),
  });
  scheduleSave(next);
});

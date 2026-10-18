import { atom, getDefaultStore } from "jotai";
import { selectAtom } from "jotai/utils";
import {
  DEFAULT_DESIGN,
  validateDesign,
  type Design,
  type Mode,
  type GradientFill,
  type RenderSettings,
  type Shape,
  type GeometryKey,
} from "@/engine/model";

const STORAGE = "glyphka.design.v1";
function load(): Design | null {
  try {
    const saved =
      localStorage.getItem(STORAGE) ??
      localStorage.getItem("glyphlab.design.v1");
    return saved ? validateDesign(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}
interface History {
  past: Design[];
  present: Design;
  future: Design[];
}
const initialDesign = structuredClone(DEFAULT_DESIGN);
const historyAtom = atom<History>({
  past: [],
  present: initialDesign,
  future: [],
});
const storageRestoredAtom = atom(false);
const restoreDesignAtom = atom(null, (get, set) => {
  if (get(storageRestoredAtom)) return;
  set(storageRestoredAtom, true);
  const history = get(historyAtom);
  // A late hydration effect must not replace an edit already made in this store.
  if (
    history.present !== initialDesign ||
    history.past.length ||
    history.future.length
  )
    return;
  const saved = load();
  if (saved) set(historyAtom, { past: [], present: saved, future: [] });
});
export function restoreDesignFromStorage(store = getDefaultStore()) {
  store.set(restoreDesignAtom);
}
export const designAtom = atom((get) => get(historyAtom).present);
export const textAtom = atom((get) => get(designAtom).text);
interface ScenePreview {
  design: Design;
  mode: Exclude<Mode, "about">;
  view: "2d" | "3d";
  selected: number;
}
const scenePreviewValueAtom = atom<ScenePreview | null>(null);
const previewDesignValueAtom = atom<Design | null>(null);
export const previewDesignAtom = atom(
  (get) => get(previewDesignValueAtom),
  (_get, set, design: Design | null) => {
    set(scenePreviewValueAtom, null);
    set(previewDesignValueAtom, design);
  },
);
export const previewSceneAtom = atom(
  (get) => get(scenePreviewValueAtom),
  (_get, set, scene: ScenePreview | null) => {
    set(scenePreviewValueAtom, scene);
    set(previewDesignValueAtom, scene?.design ?? null);
    if (scene?.view === "3d") set(threeMountedAtom, true);
  },
);
// Only the canvas follows a temporary scene; the inspector and history stay put.
export const canvasModeAtom = atom(
  (get) => get(scenePreviewValueAtom)?.mode ?? get(modeAtom),
);
export const canvasViewAtom = atom(
  (get) => get(scenePreviewValueAtom)?.view ?? get(viewAtom),
);
export const canvasSelectedGlyphAtom = atom(
  (get) => get(scenePreviewValueAtom)?.selected ?? get(selectedGlyphAtom),
);
const previewGeometryValueAtom = atom<Partial<
  Pick<Design, GeometryKey>
> | null>(null);
export const inspectorDesignAtom = atom((get) => {
  const design = get(designAtom);
  const geometry = get(previewGeometryValueAtom);
  return geometry ? { ...design, ...geometry } : design;
});
export const renderDesignAtom = atom((get) => {
  const design = get(previewDesignAtom) ?? get(designAtom);
  const geometry = get(previewGeometryValueAtom);
  return geometry ? { ...design, ...geometry } : design;
});
export const previewGeometryAtom = atom(
  null,
  (get, set, patch: Partial<Pick<Design, GeometryKey>>) => {
    set(previewGeometryValueAtom, {
      ...get(previewGeometryValueAtom),
      ...patch,
    });
  },
);
export const commitGeometryAtom = atom(null, (get, set) => {
  const geometry = get(previewGeometryValueAtom);
  if (!geometry) return;
  set(editAtom, geometry);
  set(previewGeometryValueAtom, null);
});
export const gestureActiveAtom = atom(false);
export const instantDrawingAtom = atom(
  (get) => get(gestureActiveAtom) || get(previewDesignAtom) !== null,
);
export interface Paint {
  color: string;
  gradient?: GradientFill | null;
}
const previewPaintAtom = atom<Paint | null>(null);
const documentPaintAtom = selectAtom(
  renderDesignAtom,
  (design): Paint => ({ color: design.color, gradient: design.gradient }),
  (a, b) => a.color === b.color && a.gradient === b.gradient,
);
export const paintAtom = atom(
  (get): Paint => get(previewPaintAtom) ?? get(documentPaintAtom),
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
const previewRenderValueAtom = atom<Partial<RenderSettings> | null>(null);
export const inspectorRenderSettingsAtom = atom((get) => {
  const settings = get(designAtom).render;
  const preview = get(previewRenderValueAtom);
  return preview ? { ...settings, ...preview } : settings;
});
const documentRenderAtom = selectAtom(
  renderDesignAtom,
  (design) => design.render,
);
export const renderSettingsAtom = atom((get) => {
  const preview = get(previewRenderValueAtom);
  const settings = get(documentRenderAtom);
  return preview ? { ...settings, ...preview } : settings;
});
export const previewRenderAtom = atom(
  null,
  (get, set, patch: Partial<RenderSettings>) => {
    set(previewRenderValueAtom, { ...get(previewRenderValueAtom), ...patch });
  },
);
export const commitRenderAtom = atom(null, (get, set) => {
  const preview = get(previewRenderValueAtom);
  if (!preview) return;
  set(editAtom, { render: { ...get(designAtom).render, ...preview } });
  set(previewRenderValueAtom, null);
});
const editorModeAtom = atom<Mode>("wordmark");
const modeZoomsAtom = atom<Partial<Record<Mode, number>>>({});
export const modeAtom = atom(
  (get) => get(editorModeAtom),
  (get, set, mode: Mode) => {
    const previous = get(editorModeAtom);
    if (mode === previous) return;
    const zooms = get(modeZoomsAtom);
    if (previous !== "about")
      set(modeZoomsAtom, { ...zooms, [previous]: get(zoomAtom) });
    if (mode !== "about") set(zoomAtom, zooms[mode] ?? 100);
    set(previewDesignAtom, null);
    set(editorModeAtom, mode);
  },
);
export const selectedGlyphAtom = atom(0);
export const selectedShapeAtom = atom<string | null>(null);
// A live canvas gesture is local to one shape; the document stays stable until release.
export const shapePreviewAtom = atom<Shape | null>(null);
export const threeDesignAtom = atom((get) => {
  const design = get(renderDesignAtom);
  const shape = get(shapePreviewAtom);
  return shape
    ? {
        ...design,
        shapes: design.shapes.map((item) =>
          item.id === shape.id ? shape : item,
        ),
      }
    : design;
});
export const commitShapeAtom = atom(null, (get, set) => {
  const shape = get(shapePreviewAtom);
  if (!shape) return;
  set(editAtom, (design) => ({
    ...design,
    shapes: design.shapes.map((item) => (item.id === shape.id ? shape : item)),
  }));
  set(shapePreviewAtom, null);
});

export const guidesAtom = atom(false);
export const zoomAtom = atom(100);
const rendererViewAtom = atom<"2d" | "3d">("2d");
export const threeMountedAtom = atom(false);
export const threeDisplacedAtom = atom(false);
export const viewAtom = atom(
  (get) => get(rendererViewAtom),
  (_get, set, view: "2d" | "3d") => {
    if (view === "3d") set(threeMountedAtom, true);
    set(rendererViewAtom, view);
  },
);
export interface ThreeApi {
  png: () => Promise<Blob>;
  reset: () => void;
  front: () => void;
  perspective: () => void;
  zoom: (percent: number, immediate?: boolean) => void;
  recenter: () => void;
  panMode: (enabled: boolean) => void;
  pan: (x: number, y: number) => void;
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
const gestureStartAtom = atom<Design | null>(null);
export const beginGestureAtom = atom(null, (get, set) => {
  set(gestureActiveAtom, true);
  if (!get(gestureStartAtom)) {
    clearTimeout(saveTimer);
    set(gestureStartAtom, get(designAtom));
  }
});
export const editAtom = atom(
  null,
  (get, set, patch: Partial<Design> | ((design: Design) => Design)) => {
    set(previewDesignAtom, null);
    set(previewGeometryValueAtom, null);
    const h = get(historyAtom),
      next =
        typeof patch === "function"
          ? patch(h.present)
          : { ...h.present, ...patch };
    if (JSON.stringify(next) === JSON.stringify(h.present)) return;
    set(historyAtom, {
      past: get(gestureStartAtom) ? h.past : [...h.past, h.present].slice(-80),
      present: next,
      future: [],
    });
    // Keep pagehide current, but serialize only after a live gesture commits.
    lastDesign = next;
    if (!get(gestureStartAtom)) scheduleSave(next);
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
  set(gestureActiveAtom, false);
  const gestureStart = get(gestureStartAtom);
  if (!gestureStart) return;
  const h = get(historyAtom);
  if (JSON.stringify(gestureStart) !== JSON.stringify(h.present))
    set(historyAtom, { ...h, past: [...h.past, gestureStart].slice(-80) });
  set(gestureStartAtom, null);
  scheduleSave(get(designAtom));
});
export const undoAtom = atom(null, (get, set) => {
  set(shapePreviewAtom, null);
  set(previewRenderValueAtom, null);
  set(previewGeometryValueAtom, null);
  set(previewDesignAtom, null);
  set(gestureActiveAtom, false);
  set(previewPaintAtom, null);
  set(gestureStartAtom, null);
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
  set(shapePreviewAtom, null);
  set(previewRenderValueAtom, null);
  set(previewGeometryValueAtom, null);
  set(previewDesignAtom, null);
  set(gestureActiveAtom, false);
  set(previewPaintAtom, null);
  set(gestureStartAtom, null);
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

import { createStore } from "jotai";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_DESIGN } from "@/engine/model";
import {
  beginGestureAtom,
  canRedoAtom,
  canUndoAtom,
  designAtom,
  editAtom,
  endGestureAtom,
  redoAtom,
  undoAtom,
  paintAtom,
  previewColorAtom,
  commitPaintAtom,
  previewGeometryAtom,
  previewDesignAtom,
  inspectorDesignAtom,
  inspectorRenderSettingsAtom,
  commitGeometryAtom,
  renderDesignAtom,
  restoreDesignFromStorage,
  renderSettingsAtom,
  previewRenderAtom,
  commitRenderAtom,
} from "./studio";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("keeps inspector controls stable during direction hover while live edits still update them", () => {
  const store = createStore();
  const initial = store.get(designAtom);
  const geometryChanges = vi.fn();
  const renderChanges = vi.fn();
  const unsubscribeGeometry = store.sub(inspectorDesignAtom, geometryChanges);
  const unsubscribeRender = store.sub(
    inspectorRenderSettingsAtom,
    renderChanges,
  );
  for (let i = 0; i < 100; i++)
    store.set(previewDesignAtom, {
      ...initial,
      weight: 10 + (i % 24),
      seed: i,
      render: { ...initial.render, depth: i },
    });
  expect(store.get(renderDesignAtom).weight).toBe(13);
  expect(store.get(renderSettingsAtom).depth).toBe(99);
  expect(store.get(inspectorDesignAtom)).toBe(initial);
  expect(store.get(inspectorRenderSettingsAtom)).toBe(initial.render);
  expect(geometryChanges).not.toHaveBeenCalled();
  expect(renderChanges).not.toHaveBeenCalled();
  store.set(previewDesignAtom, null);
  store.set(previewGeometryAtom, { weight: 28 });
  store.set(previewRenderAtom, { depth: 42 });
  expect(store.get(inspectorDesignAtom).weight).toBe(28);
  expect(store.get(renderDesignAtom).weight).toBe(28);
  expect(store.get(inspectorRenderSettingsAtom).depth).toBe(42);
  expect(store.get(renderSettingsAtom).depth).toBe(42);
  expect(store.get(designAtom)).toBe(initial);
  unsubscribeGeometry();
  unsubscribeRender();
});

it("previews live 3D settings without publishing document changes and commits one undo step", () => {
  const store = createStore();
  const initial = store.get(designAtom);
  const documentChanges = vi.fn();
  const unsubscribe = store.sub(designAtom, documentChanges);
  for (let i = 1; i <= 100; i++)
    store.set(previewRenderAtom, {
      rotationX: i,
      background: "#e88044",
      transparent: false,
      autoRotateSpeed: i / 20,
    });
  expect(store.get(renderSettingsAtom)).toMatchObject({
    rotationX: 100,
    background: "#e88044",
    transparent: false,
    autoRotateSpeed: 5,
  });
  expect(store.get(designAtom)).toBe(initial);
  expect(documentChanges).not.toHaveBeenCalled();
  expect(store.get(canUndoAtom)).toBe(false);
  store.set(commitRenderAtom);
  expect(documentChanges).toHaveBeenCalledTimes(1);
  expect(store.get(designAtom).shapes).toBe(initial.shapes);
  store.set(undoAtom);
  expect(store.get(designAtom)).toBe(initial);
  expect(store.get(renderSettingsAtom)).toEqual(initial.render);
  expect(store.get(canUndoAtom)).toBe(false);
  store.set(redoAtom);
  expect(store.get(renderSettingsAtom).background).toBe("#e88044");
  unsubscribe();
});

it("groups live slider edits into one reversible gesture", () => {
  const store = createStore(),
    initial = store.get(designAtom);
  const paint = store.get(paintAtom);
  store.set(beginGestureAtom);
  for (let weight = 10; weight <= 34; weight++) store.set(editAtom, { weight });
  expect(store.get(designAtom).weight).toBe(34);
  expect(store.get(paintAtom)).toBe(paint);
  store.set(endGestureAtom);
  expect(store.get(canUndoAtom)).toBe(true);
  store.set(undoAtom);
  expect(store.get(designAtom)).toEqual(initial);
  expect(store.get(canUndoAtom)).toBe(false);
  store.set(redoAtom);
  expect(store.get(designAtom).weight).toBe(34);
  store.set(undoAtom);
  store.set(editAtom, { text: "NEW" });
  expect(store.get(canRedoAtom)).toBe(false);
});

it("previews paint without changing geometry or history, then commits one undo step", () => {
  const store = createStore(),
    initial = store.get(designAtom);
  for (const color of ["#2563eb", "#a855f7", "#ff5a1f"])
    store.set(previewColorAtom, { color });
  expect(store.get(designAtom)).toBe(initial);
  expect(store.get(canUndoAtom)).toBe(false);
  expect(store.get(paintAtom).color).toBe("#ff5a1f");
  store.set(commitPaintAtom);
  expect(store.get(designAtom).shapes).toBe(initial.shapes);
  expect(store.get(designAtom).color).toBe("#ff5a1f");
  store.set(undoAtom);
  expect(store.get(designAtom)).toBe(initial);
  expect(store.get(paintAtom).color).toBe(initial.color);
});

it("restores validated local work after a deterministic first render without saving or history", () => {
  const saved = { ...DEFAULT_DESIGN, text: "RESTORED", weight: 31 };
  const storage = {
    getItem: vi.fn((key: string) =>
      key === "glyphlab.design.v1" ? JSON.stringify(saved) : null,
    ),
    setItem: vi.fn(),
  };
  vi.stubGlobal("localStorage", storage);
  const store = createStore();
  expect(store.get(designAtom)).toEqual(DEFAULT_DESIGN);
  restoreDesignFromStorage(store);
  expect(store.get(designAtom).text).toBe("RESTORED");
  expect(store.get(designAtom).weight).toBe(31);
  expect(store.get(canUndoAtom)).toBe(false);
  expect(store.get(canRedoAtom)).toBe(false);
  restoreDesignFromStorage(store);
  expect(storage.getItem).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(1000);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it("does not replace an edit made before the restoration effect", () => {
  const store = createStore();
  store.set(editAtom, { text: "EDITED" });
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => JSON.stringify(DEFAULT_DESIGN)),
    setItem: vi.fn(),
  });
  restoreDesignFromStorage(store);
  expect(store.get(designAtom).text).toBe("EDITED");
  expect(store.get(canUndoAtom)).toBe(true);
});

it("keeps concurrent stores' gestures separate and defers storage until commit", () => {
  const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
  vi.stubGlobal("localStorage", storage);
  const first = createStore(),
    second = createStore();
  second.set(editAtom, { weight: 35 });
  first.set(beginGestureAtom);
  second.set(beginGestureAtom);
  first.set(editAtom, { weight: 19 });
  second.set(editAtom, { weight: 26 });
  vi.advanceTimersByTime(1000);
  expect(storage.setItem).not.toHaveBeenCalled();
  first.set(endGestureAtom);
  second.set(endGestureAtom);
  vi.advanceTimersByTime(250);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  first.set(undoAtom);
  second.set(undoAtom);
  expect(first.get(designAtom).weight).toBe(DEFAULT_DESIGN.weight);
  expect(second.get(designAtom).weight).toBe(35);
});

it("keeps shape gestures out of document subscribers and commits one undoable change", async () => {
  const { shapePreviewAtom, commitShapeAtom } = await import("./studio");
  const store = createStore();
  const original = store.get(designAtom);
  let changes = 0;
  const unsubscribe = store.sub(designAtom, () => changes++);
  store.set(beginGestureAtom);
  for (let x = 100; x < 200; x++)
    store.set(shapePreviewAtom, { ...original.shapes[0], x });
  expect(changes).toBe(0);
  store.set(commitShapeAtom);
  store.set(endGestureAtom);
  expect(changes).toBe(1);
  expect(store.get(designAtom).shapes[0].x).toBe(199);
  expect(store.get(designAtom).shapes[1]).toBe(original.shapes[1]);
  expect(store.get(shapePreviewAtom)).toBeNull();
  store.set(undoAtom);
  expect(store.get(designAtom)).toBe(original);
  expect(store.get(canUndoAtom)).toBe(false);
  store.set(redoAtom);
  expect(store.get(designAtom).shapes[0].x).toBe(199);
  unsubscribe();
});

it("previews geometry without waking the document or its catalogs and commits one undo step", () => {
  const store = createStore();
  const initial = store.get(designAtom);
  const documentChanged = vi.fn();
  store.sub(designAtom, documentChanged);
  store.set(beginGestureAtom);
  for (let weight = 10; weight <= 34; weight++)
    store.set(previewGeometryAtom, { weight, tracking: weight });
  expect(store.get(renderDesignAtom)).toMatchObject({
    weight: 34,
    tracking: 34,
  });
  expect(store.get(designAtom)).toBe(initial);
  expect(documentChanged).not.toHaveBeenCalled();
  expect(store.get(canUndoAtom)).toBe(false);
  store.set(commitGeometryAtom);
  store.set(endGestureAtom);
  expect(documentChanged).toHaveBeenCalledTimes(1);
  expect(store.get(designAtom)).toMatchObject({ weight: 34, tracking: 34 });
  store.set(undoAtom);
  expect(store.get(designAtom)).toBe(initial);
  expect(store.get(renderDesignAtom)).toBe(initial);
  expect(store.get(canUndoAtom)).toBe(false);
  store.set(redoAtom);
  expect(store.get(renderDesignAtom).weight).toBe(34);
});

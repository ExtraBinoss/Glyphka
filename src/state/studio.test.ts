import { createStore } from "jotai";
import { expect, it } from "vitest";
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
} from "./studio";

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

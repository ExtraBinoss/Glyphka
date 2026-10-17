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
} from "./studio";

it("groups live slider edits into one reversible gesture", () => {
  const store = createStore(),
    initial = store.get(designAtom);
  store.set(beginGestureAtom);
  for (let weight = 10; weight <= 34; weight++) store.set(editAtom, { weight });
  expect(store.get(designAtom).weight).toBe(34);
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

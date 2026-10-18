import { useEffect } from "react";
import { getDefaultStore } from "jotai";
import type { Mode } from "@/engine/model";
import { modeAtom, selectedGlyphAtom } from "@/state/studio";

type Location = { mode: Mode; glyph: number };
type Entry = { current: Location; previous: Location | null };
const modes: Mode[] = ["wordmark", "symbol", "shapes", "about"];

function readEntry(state: unknown): Entry | null {
  if (!state || typeof state !== "object" || !("glyphka" in state)) return null;
  const entry = state.glyphka as Partial<Entry> | null;
  if (
    !entry?.current ||
    !modes.includes(entry.current.mode) ||
    !Number.isInteger(entry.current.glyph) ||
    entry.current.glyph < 0
  )
    return null;
  return { current: entry.current, previous: entry.previous ?? null };
}

export function backToLettering() {
  const entry = readEntry(window.history.state);
  if (entry?.current.mode === "symbol" && entry.previous?.mode === "wordmark") {
    window.history.back();
  } else getDefaultStore().set(modeAtom, "wordmark");
}

export function useStudioNavigation() {
  useEffect(() => {
    const store = getDefaultStore();
    let restoring = false;
    const snapshot = (): Location => ({
      mode: store.get(modeAtom),
      glyph: store.get(selectedGlyphAtom),
    });
    const restore = (location: Location) => {
      restoring = true;
      store.set(selectedGlyphAtom, location.glyph);
      store.set(modeAtom, location.mode);
      restoring = false;
    };
    const saved = readEntry(window.history.state);
    if (saved) restore(saved.current);
    let current = snapshot();
    window.history.replaceState(
      {
        ...window.history.state,
        glyphka: saved ?? { current, previous: null },
      },
      "",
    );
    const record = () => {
      if (restoring) return;
      const next = snapshot();
      if (
        next.mode === current.mode &&
        (next.mode !== "symbol" || next.glyph === current.glyph)
      )
        return;
      window.history.pushState(
        {
          ...window.history.state,
          glyphka: { current: next, previous: current },
        },
        "",
      );
      current = next;
    };
    const pop = (event: PopStateEvent) => {
      const entry = readEntry(event.state);
      if (entry) {
        restore(entry.current);
        current = entry.current;
      }
    };
    const preventSideButton = (event: MouseEvent) => {
      if (event.button !== 3 && event.button !== 4) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const navigateSideButton = (event: PointerEvent) => {
      if (event.button !== 3 && event.button !== 4) return;
      preventSideButton(event);
      window.history.go(event.button === 3 ? -1 : 1);
    };
    const unmode = store.sub(modeAtom, record);
    const unglyph = store.sub(selectedGlyphAtom, record);
    window.addEventListener("popstate", pop);
    window.addEventListener("pointerdown", preventSideButton, true);
    window.addEventListener("pointerup", navigateSideButton, true);
    window.addEventListener("auxclick", preventSideButton, true);
    return () => {
      unmode();
      unglyph();
      window.removeEventListener("popstate", pop);
      window.removeEventListener("pointerdown", preventSideButton, true);
      window.removeEventListener("pointerup", navigateSideButton, true);
      window.removeEventListener("auxclick", preventSideButton, true);
    };
  }, []);
}

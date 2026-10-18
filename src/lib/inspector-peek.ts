import { animate } from "motion/react";

type SavedNode = {
  element: HTMLElement;
  opacity: string;
  visibleOpacity: number;
};
let current: { dispose: () => void } | null = null;

/** Reveal the canvas without moving or cloning the active control. */
export function beginInspectorPeek(field: HTMLElement, pointerId: number) {
  const popup = field.closest<HTMLElement>(".properties-sheet");
  if (!popup) return;
  current?.dispose();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const muted: SavedNode[] = [];
  const paths: HTMLElement[] = [];
  let controls: { stop: () => void }[] = [];
  let disposed = false,
    finishing = false;
  const remember = (element: HTMLElement) => {
    muted.push({
      element,
      opacity: element.style.opacity,
      visibleOpacity: Number(getComputedStyle(element).opacity),
    });
  };
  for (
    let branch = field;
    branch.parentElement;
    branch = branch.parentElement
  ) {
    const parent = branch.parentElement;
    paths.push(parent);
    for (const sibling of parent.children) {
      if (
        sibling !== branch &&
        sibling instanceof HTMLElement &&
        sibling.dataset.slot !== "drawer-surface"
      )
        remember(sibling);
    }
    if (parent === popup) break;
  }
  const surface = popup.querySelector<HTMLElement>(
    '[data-slot="drawer-surface"]',
  );
  const overlay =
    popup
      .closest("[data-base-ui-portal]")
      ?.querySelector<HTMLElement>('[data-slot="drawer-overlay"]') ??
    document.querySelector<HTMLElement>('[data-slot="drawer-overlay"]');
  if (surface) remember(surface);
  if (overlay) remember(overlay);
  // Finish all layout/style reads before changing any attributes.
  popup.dataset.adjusting = "true";
  field.dataset.peekActive = "";
  for (const path of paths) path.dataset.peekPath = "";
  for (const { element } of muted) element.dataset.peekMuted = "";
  controls = muted.map(({ element }) =>
    animate(
      element,
      { opacity: 0 },
      { duration: reduced ? 0 : 0.16, ease: "easeOut" },
    ),
  );
  const detach = () => {
    window.removeEventListener("pointerup", release, true);
    window.removeEventListener("pointercancel", release, true);
    window.removeEventListener("blur", finish);
    window.removeEventListener("keydown", key, true);
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    detach();
    for (const control of controls) control.stop();
    for (const { element, opacity } of muted) {
      element.style.opacity = opacity;
      delete element.dataset.peekMuted;
    }
    for (const path of paths) delete path.dataset.peekPath;
    delete field.dataset.peekActive;
    delete popup.dataset.adjusting;
    if (current?.dispose === dispose) current = null;
  };
  function finish() {
    if (disposed || finishing) return;
    finishing = true;
    detach();
    for (const control of controls) control.stop();
    const restore = muted.map(({ element, visibleOpacity }) =>
      animate(
        element,
        { opacity: visibleOpacity },
        { duration: reduced ? 0 : 0.22, ease: "easeOut" },
      ),
    );
    controls = restore;
    void Promise.all(restore).then(dispose).catch(dispose);
  }
  function release(event: PointerEvent) {
    if (event.pointerId === pointerId) finish();
  }
  function key(event: KeyboardEvent) {
    if (event.key === "Escape") finish();
  }
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);
  window.addEventListener("blur", finish);
  window.addEventListener("keydown", key, true);
  current = { dispose };
  return dispose;
}

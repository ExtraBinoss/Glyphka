import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { getDefaultStore } from "jotai";
import type { Mode } from "@/engine/model";
import { modeAtom, threeApiAtom, viewAtom, zoomAtom } from "@/state/studio";

type Point = { x: number; y: number };
type Drag = { id: number; mode: Mode; start: Point; pan: Point; scale: number };

export function useCanvasViewport(mode: Mode, zoom: number, view: "2d" | "3d") {
  const host = useRef<HTMLDivElement>(null);
  const drawing = useRef<HTMLDivElement>(null);
  const pans = useRef<Partial<Record<Mode, Point>>>({});
  const [canRecenter, setCanRecenter] = useState(false);
  const apply = useCallback(() => {
    const store = getDefaultStore();
    const pan = pans.current[store.get(modeAtom)] ?? { x: 0, y: 0 };
    const scale = store.get(zoomAtom) / 100;
    if (drawing.current)
      drawing.current.style.transform = `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`;
    const element = host.current;
    if (element) {
      const distance = Math.hypot(pan.x, pan.y) * scale;
      const displaced =
        distance >
        Math.max(
          80,
          Math.min(element.clientWidth, element.clientHeight) * 0.25,
        );
      setCanRecenter(displaced);
    }
  }, []);
  useLayoutEffect(apply, [apply, mode, zoom, view]);
  const recenter = useCallback(() => {
    pans.current[getDefaultStore().get(modeAtom)] = { x: 0, y: 0 };
    apply();
  }, [apply]);

  useEffect(() => {
    const element = host.current!;
    const store = getDefaultStore();
    let drag: Drag | null = null;
    const touchPointers = new Map<number, EventTarget | null>();
    let pinch: {
      distance: number;
      zoom: number;
      anchor: Point;
      center: Point;
      rect: DOMRect;
      mode: Mode;
    } | null = null;
    let space = false;
    let suppressClick = false;
    let clickTimer: ReturnType<typeof setTimeout>;
    let lastPan = -Infinity;
    const setSpace = (value: boolean) => {
      space = value;
      element.dataset.panReady = String(value);
      store.get(threeApiAtom)?.panMode(value && store.get(viewAtom) === "3d");
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest(
          'input,textarea,select,[contenteditable="true"],[role="slider"],[role="dialog"]',
        ) ||
          (!element.contains(target) &&
            !element.matches(":hover") &&
            target.closest('button,a,[role="button"]')))
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setSpace(true);
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpace(false);
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        touchPointers.set(event.pointerId, event.target);
        if (touchPointers.size > 1) {
          event.stopPropagation();
          return;
        }
      }
      if (
        store.get(viewAtom) !== "2d" ||
        drag ||
        !(
          event.button === 1 ||
          (space && (event.button === 0 || event.button === 2))
        )
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest("button,a,input")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const currentMode = store.get(modeAtom);
      drag = {
        id: event.pointerId,
        mode: currentMode,
        start: { x: event.clientX, y: event.clientY },
        pan: pans.current[currentMode] ?? { x: 0, y: 0 },
        scale: store.get(zoomAtom) / 100,
      };
      suppressClick = event.button === 0;
      clearTimeout(clickTimer);
      element.dataset.panning = "true";
      element.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (pinch) {
        event.stopPropagation();
        return;
      }
      if (!drag || event.pointerId !== drag.id) return;
      event.preventDefault();
      event.stopPropagation();
      pans.current[drag.mode] = {
        x: drag.pan.x + (event.clientX - drag.start.x) / drag.scale,
        y: drag.pan.y + (event.clientY - drag.start.y) / drag.scale,
      };
      apply();
    };
    const finish = () => {
      if (!drag) return;
      const id = drag.id;
      drag = null;
      lastPan = performance.now();
      element.dataset.panning = "false";
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
      clickTimer = setTimeout(() => {
        suppressClick = false;
      }, 0);
    };
    const up = (event: PointerEvent) => {
      const syntheticCancel =
        event.type === "pointercancel" && !event.isTrusted;
      if (!syntheticCancel && event.type !== "lostpointercapture")
        touchPointers.delete(event.pointerId);
      if (pinch && !syntheticCancel) {
        event.stopPropagation();
        return;
      }
      if (event.pointerId !== drag?.id) return;
      event.preventDefault();
      event.stopPropagation();
      finish();
    };
    const click = (event: MouseEvent) => {
      if (suppressClick || event.button === 1) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }
    };
    const contextmenu = (event: MouseEvent) => {
      if (space || drag || performance.now() - lastPan < 300) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const blur = () => {
      pinch = null;
      touchPointers.clear();
      delete element.dataset.pinching;
      setSpace(false);
      finish();
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const old = store.get(zoomAtom);
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? element.clientHeight
            : 1);
      const next = Math.round(
        Math.max(25, Math.min(400, old * Math.exp(-delta * 0.0015))),
      );
      if (store.get(viewAtom) === "2d") {
        const rect = element.getBoundingClientRect();
        const currentMode = store.get(modeAtom);
        const pan = pans.current[currentMode] ?? { x: 0, y: 0 };
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        pans.current[currentMode] = {
          x: pan.x + x * (100 / next - 100 / old),
          y: pan.y + y * (100 / next - 100 / old),
        };
      }
      store.set(zoomAtom, next);
      apply();
    };
    const centerOf = (touches: TouchList): Point => ({
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    });
    const distanceOf = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      event.stopPropagation();
      finish();
      // Cancel an existing single-finger shape/orbit gesture before taking over.
      for (const [pointerId, target] of touchPointers) {
        target?.dispatchEvent(
          new PointerEvent("pointercancel", {
            pointerId,
            pointerType: "touch",
            bubbles: true,
          }),
        );
      }
      const center = centerOf(event.touches);
      const rect = element.getBoundingClientRect();
      const currentMode = store.get(modeAtom);
      const zoom = store.get(zoomAtom);
      const pan = pans.current[currentMode] ?? { x: 0, y: 0 };
      pinch = {
        distance: Math.max(1, distanceOf(event.touches)),
        zoom,
        center,
        rect,
        mode: currentMode,
        anchor: {
          x: ((center.x - rect.left - rect.width / 2) * 100) / zoom - pan.x,
          y: ((center.y - rect.top - rect.height / 2) * 100) / zoom - pan.y,
        },
      };
      element.dataset.pinching = "true";
    };
    const touchMove = (event: TouchEvent) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      event.stopPropagation();
      const center = centerOf(event.touches);
      const next = Math.max(
        25,
        Math.min(
          400,
          Math.round((pinch.zoom * distanceOf(event.touches)) / pinch.distance),
        ),
      );
      if (store.get(viewAtom) === "2d") {
        pans.current[pinch.mode] = {
          x:
            ((center.x - pinch.rect.left - pinch.rect.width / 2) * 100) / next -
            pinch.anchor.x,
          y:
            ((center.y - pinch.rect.top - pinch.rect.height / 2) * 100) / next -
            pinch.anchor.y,
        };
      } else {
        const api = store.get(threeApiAtom);
        api?.zoom(next, true);
        api?.pan(center.x - pinch.center.x, center.y - pinch.center.y);
      }
      pinch.center = center;
      store.set(zoomAtom, next);
      apply();
    };
    const touchEnd = (event: TouchEvent) => {
      if (!pinch || event.touches.length >= 2) return;
      event.preventDefault();
      event.stopPropagation();
      pinch = null;
      delete element.dataset.pinching;
    };
    element.addEventListener("touchstart", touchStart, {
      passive: false,
      capture: true,
    });
    element.addEventListener("touchmove", touchMove, {
      passive: false,
      capture: true,
    });
    element.addEventListener("touchend", touchEnd, {
      passive: false,
      capture: true,
    });
    element.addEventListener("touchcancel", touchEnd, {
      passive: false,
      capture: true,
    });
    element.addEventListener("pointerdown", down, true);
    element.addEventListener("pointermove", move, true);
    element.addEventListener("pointerup", up, true);
    element.addEventListener("pointercancel", up, true);
    element.addEventListener("lostpointercapture", up, true);
    element.addEventListener("click", click, true);
    element.addEventListener("auxclick", click, true);
    element.addEventListener("contextmenu", contextmenu);
    element.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", keydown, true);
    window.addEventListener("keyup", keyup, true);
    window.addEventListener("blur", blur);
    return () => {
      blur();
      clearTimeout(clickTimer);
      element.removeEventListener("touchstart", touchStart, true);
      element.removeEventListener("touchmove", touchMove, true);
      element.removeEventListener("touchend", touchEnd, true);
      element.removeEventListener("touchcancel", touchEnd, true);
      element.removeEventListener("pointerdown", down, true);
      element.removeEventListener("pointermove", move, true);
      element.removeEventListener("pointerup", up, true);
      element.removeEventListener("pointercancel", up, true);
      element.removeEventListener("lostpointercapture", up, true);
      element.removeEventListener("click", click, true);
      element.removeEventListener("auxclick", click, true);
      element.removeEventListener("contextmenu", contextmenu);
      element.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("keyup", keyup, true);
      window.removeEventListener("blur", blur);
    };
  }, [apply]);
  return { host, drawing, recenter, canRecenter };
}

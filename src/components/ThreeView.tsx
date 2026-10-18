import { useEffect, useRef, useState } from "react";
import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Box } from "lucide-react";
import { useAnimate } from "motion/react";
import {
  threeDesignAtom,
  gestureActiveAtom,
  paintAtom,
  canvasModeAtom,
  canvasSelectedGlyphAtom,
  previewDesignAtom,
  threeApiAtom,
  zoomAtom,
  threeDisplacedAtom,
  renderSettingsAtom,
} from "@/state/studio";
import { ThreeStudio } from "@/lib/three-studio";
import { createEnvironment } from "@/lib/environment";

export default function ThreeView({ active = true }: { active?: boolean }) {
  const design = useAtomValue(threeDesignAtom),
    mode = useAtomValue(canvasModeAtom),
    zoom = useAtomValue(zoomAtom),
    selected = useAtomValue(canvasSelectedGlyphAtom),
    preview = useAtomValue(previewDesignAtom),
    setApi = useSetAtom(threeApiAtom),
    setDisplaced = useSetAtom(threeDisplacedAtom),
    { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null),
    studio = useRef<ThreeStudio | null>(null),
    appliedDesign = useRef(design),
    [status, setStatus] = useState("loading");
  const [scope, animate] = useAnimate();
  const disposal = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prepared = useRef(false);
  useEffect(() => {
    if (!active) return;
    const animation = animate(
      scope.current,
      { opacity: preview ? 1 : [0.4, 1], scale: preview ? 1 : [0.98, 1] },
      { duration: preview ? 0 : 0.32 },
    );
    return () => animation.stop();
  }, [mode, active, preview, animate, scope]);
  useEffect(() => {
    clearTimeout(disposal.current);
    if (!host.current || studio.current)
      return () => {
        disposal.current = setTimeout(() => {
          studio.current?.dispose();
          studio.current = null;
          setApi(null);
        }, 0);
      };
    let instance: ThreeStudio;
    try {
      const api = {
        png: () => instance.png(),
        reset: () => instance.reset(),
        front: () => instance.view(true),
        perspective: () => instance.view(false),
        zoom: (percent: number, immediate = false) =>
          instance.zoom(percent, immediate),
        pan: (x: number, y: number) => instance.pan(x, y),
        recenter: () => instance.recenter(),
        panMode: (enabled: boolean) => instance.panMode(enabled),
      };
      instance = new ThreeStudio(
        host.current,
        design.render,
        (error) => {
          if (error) setApi(null);
          else {
            setApi(api);
          }
          setStatus(error ? "error" : "ready");
          if (host.current) {
            host.current.dataset.ready = error ? "false" : "true";
            if (error) host.current.dataset.error = error;
            else delete host.current.dataset.error;
          }
        },
        createEnvironment(),
        setDisplaced,
      );
      studio.current = instance;
    } catch {
      queueMicrotask(() => setStatus("unavailable"));
      return;
    }
    return () => {
      setApi(null);
      setDisplaced(false);
      disposal.current = setTimeout(() => {
        instance.dispose();
        studio.current = null;
      }, 0);
    };
    // The scene owns GPU resources for this mount. Updates use the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setApi, setDisplaced]);
  useEffect(() => {
    studio.current?.canvas.setAttribute("aria-label", t("render3d"));
  }, [t]);
  useEffect(() => {
    studio.current?.zoom(zoom);
  }, [zoom, active]);
  useEffect(() => {
    studio.current?.setActive(active);
  }, [active]);
  useEffect(() => {
    if (!active && prepared.current) return;
    prepared.current = true;
    appliedDesign.current = design;
    const paint = getDefaultStore().get(paintAtom);
    studio.current?.update(
      { ...design, render: getDefaultStore().get(renderSettingsAtom) },
      mode === "shapes" ? "shapes" : mode === "symbol" ? "symbol" : "wordmark",
      Math.min(selected, Math.max(0, design.text.length - 1)),
      {
        color:
          paint.color === "auto"
            ? getComputedStyle(document.documentElement)
                .getPropertyValue("--foreground")
                .trim()
            : paint.color,
        gradient: paint.gradient,
      },
      getDefaultStore().get(gestureActiveAtom),
    );
  }, [design, mode, selected, active]);
  useEffect(() => {
    if (!active) return;
    const store = getDefaultStore();
    const update = () => {
      const paint = store.get(paintAtom);
      studio.current?.setPaint({
        color:
          paint.color === "auto"
            ? getComputedStyle(document.documentElement)
                .getPropertyValue("--foreground")
                .trim()
            : paint.color,
        gradient: paint.gradient,
      });
    };
    update();
    const unsubscribe = store.sub(paintAtom, update);
    const render = () => {
      // A design change is applied atomically by the geometry effect. Combining
      // its new extrusion with the previous glyph would enqueue a wasted mesh.
      if (store.get(threeDesignAtom) !== appliedDesign.current) return;
      studio.current?.setRender(
        store.get(renderSettingsAtom),
        store.get(gestureActiveAtom),
      );
    };
    render();
    const unrender = store.sub(renderSettingsAtom, render);
    const theme = new MutationObserver(update);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      unsubscribe();
      unrender();
      theme.disconnect();
    };
  }, [active]);
  return (
    <div ref={scope} className="three-view">
      <div ref={host} className="three-host" data-testid="three-scene" />
      {status !== "ready" && (
        <div className="three-status">
          <Box size={22} />
          <span>
            {t(
              status === "loading"
                ? "preparing3d"
                : status === "unavailable"
                  ? "webglUnavailable"
                  : "geometryError",
            )}
          </span>
        </div>
      )}
    </div>
  );
}

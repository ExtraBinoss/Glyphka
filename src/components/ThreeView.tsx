import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Box } from "lucide-react";
import { useAnimate } from "motion/react";
import {
  renderDesignAtom,
  paintAtom,
  modeAtom,
  selectedGlyphAtom,
  threeApiAtom,
  zoomAtom,
} from "@/state/studio";
import { ThreeStudio } from "@/lib/three-studio";
import { createEnvironment } from "@/lib/environment";

export default function ThreeView({ active = true }: { active?: boolean }) {
  const design = useAtomValue(renderDesignAtom),
    paint = useAtomValue(paintAtom),
    mode = useAtomValue(modeAtom),
    zoom = useAtomValue(zoomAtom),
    selected = useAtomValue(selectedGlyphAtom),
    setApi = useSetAtom(threeApiAtom),
    { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null),
    studio = useRef<ThreeStudio | null>(null),
    [status, setStatus] = useState("loading");
  const [scope, animate] = useAnimate();
  const disposal = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prepared = useRef(false);
  useEffect(() => {
    if (!active) return;
    const animation = animate(
      scope.current,
      { opacity: [0.4, 1], scale: [0.98, 1] },
      { duration: 0.32 },
    );
    return () => animation.stop();
  }, [mode, active, animate, scope]);
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
        zoom: (percent: number) => instance.zoom(percent),
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
      );
      studio.current = instance;
    } catch {
      queueMicrotask(() => setStatus("unavailable"));
      return;
    }
    return () => {
      setApi(null);
      disposal.current = setTimeout(() => {
        instance.dispose();
        studio.current = null;
      }, 0);
    };
    // The scene owns GPU resources for this mount. Updates use the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setApi]);
  useEffect(() => {
    studio.current?.zoom(zoom);
  }, [zoom, active]);
  useEffect(() => {
    studio.current?.setActive(active);
  }, [active]);
  useEffect(() => {
    if (!active && prepared.current) return;
    prepared.current = true;
    const update = () => {
      const ink =
        paint.color === "auto"
          ? getComputedStyle(document.documentElement)
              .getPropertyValue("--foreground")
              .trim()
          : paint.color;
      studio.current?.update(
        design,
        mode === "shapes"
          ? "shapes"
          : mode === "symbol"
            ? "symbol"
            : "wordmark",
        Math.min(selected, Math.max(0, design.text.length - 1)),
        { color: ink, gradient: paint.gradient },
      );
    };
    update();
    if (!active) return;
    const theme = new MutationObserver(update);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => theme.disconnect();
  }, [design, mode, selected, paint, active]);
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

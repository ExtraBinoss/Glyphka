import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Box } from "lucide-react";
import {
  designAtom,
  modeAtom,
  selectedGlyphAtom,
  threeApiAtom,
} from "@/state/studio";
import { ThreeStudio } from "@/lib/three-studio";

export default function ThreeView() {
  const design = useAtomValue(designAtom),
    mode = useAtomValue(modeAtom),
    selected = useAtomValue(selectedGlyphAtom),
    setApi = useSetAtom(threeApiAtom),
    { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null),
    studio = useRef<ThreeStudio | null>(null),
    [status, setStatus] = useState("loading");
  useEffect(() => {
    if (!host.current) return;
    let instance: ThreeStudio;
    try {
      instance = new ThreeStudio(host.current, design.render, (error) => {
        setStatus(error ? "error" : "ready");
        if (host.current) {
          host.current.dataset.ready = error ? "false" : "true";
          if (error) host.current.dataset.error = error;
        }
      });
      studio.current = instance;
      setApi({
        png: () => instance.png(),
        reset: () => instance.reset(),
        front: () => instance.view(true),
        perspective: () => instance.view(false),
        zoom: (percent) => instance.zoom(percent),
      });
    } catch {
      queueMicrotask(() => setStatus("unavailable"));
      return;
    }
    return () => {
      setApi(null);
      studio.current = null;
      instance.dispose();
    };
    // The scene owns GPU resources for this mount. Updates use the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setApi]);
  useEffect(() => {
    const update = () => {
      const ink =
        design.color === "auto"
          ? getComputedStyle(document.documentElement)
              .getPropertyValue("--foreground")
              .trim()
          : design.color;
      studio.current?.update(
        design,
        mode === "shapes"
          ? "shapes"
          : mode === "symbol"
            ? "symbol"
            : "wordmark",
        Math.min(selected, Math.max(0, design.text.length - 1)),
        ink,
      );
    };
    update();
    const theme = new MutationObserver(update);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => theme.disconnect();
  }, [design, mode, selected]);
  return (
    <div className="three-view">
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

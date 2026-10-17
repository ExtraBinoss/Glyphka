import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Box } from "lucide-react";
import {
  designAtom,
  renderDesignAtom,
  modeAtom,
  selectedGlyphAtom,
  guidesAtom,
  zoomAtom,
  viewAtom,
  threeMountedAtom,
} from "@/state/studio";
import { buildMesh } from "@/engine/mesh-service";
import { loadThree } from "@/lib/preload-three";
import type { Mode } from "@/engine/model";
import { Lettering } from "./Drawing";
import { ShapeCanvas } from "./ShapeCanvas";
import { Button } from "./ui/button";
const ThreeView = lazy(loadThree);
export function CanvasView() {
  const mode = useAtomValue(modeAtom),
    setMode = useSetAtom(modeAtom),
    design = useAtomValue(renderDesignAtom),
    savedDesign = useAtomValue(designAtom),
    selected = useAtomValue(selectedGlyphAtom),
    select = useSetAtom(selectedGlyphAtom),
    guides = useAtomValue(guidesAtom),
    zoom = useAtomValue(zoomAtom),
    view = useAtomValue(viewAtom),
    mounted = useAtomValue(threeMountedAtom),
    { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null),
    panRef = useRef<Partial<Record<Mode, { x: number; y: number }>>>({}),
    [pans, setPans] = useState<Partial<Record<Mode, { x: number; y: number }>>>(
      {},
    );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode !== "about") {
        void loadThree().catch(() => {
          /* Explicit activation can retry. */
        });
        void buildMesh(savedDesign, mode, selected, false).catch(() => {
          /* Optional prewarm. */
        });
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [savedDesign, mode, selected]);
  useEffect(() => {
    const element = host.current!,
      store = getDefaultStore();
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const old = store.get(zoomAtom),
        delta =
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
        const rect = element.getBoundingClientRect(),
          currentMode = store.get(modeAtom),
          pan = panRef.current[currentMode] ?? { x: 0, y: 0 },
          x = event.clientX - rect.left - rect.width / 2,
          y = event.clientY - rect.top - rect.height / 2;
        panRef.current = {
          ...panRef.current,
          [currentMode]: {
            x: pan.x + x * (100 / next - 100 / old),
            y: pan.y + y * (100 / next - 100 / old),
          },
        };
        setPans(panRef.current);
      }
      store.set(zoomAtom, Math.round(next));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  const ink = design.color === "auto" ? "var(--foreground)" : design.color;
  const pan = pans[mode] ?? { x: 0, y: 0 };
  return (
    <div
      ref={host}
      className={`canvas-area ${mode === "shapes" ? "composition-area" : ""}`}
    >
      <AnimatePresence>
        {mode === "symbol" && (
          <m.div
            className="symbol-back"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
          >
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("backToWordmark")}
              onClick={() => setMode("wordmark")}
            >
              <ArrowLeft />
              {t("back")}
            </Button>
          </m.div>
        )}
      </AnimatePresence>
      {mounted && (
        <m.div
          className="three-canvas-transition"
          aria-hidden={view !== "3d"}
          style={{
            pointerEvents: view === "3d" ? "auto" : "none",
            visibility: view === "3d" ? "visible" : "hidden",
          }}
          initial={false}
          animate={{ opacity: view === "3d" ? 1 : 0 }}
          transition={{ duration: 0.22 }}
        >
          <Suspense
            fallback={
              <div className="three-status">
                <Box />
              </div>
            }
          >
            <ThreeView active={view === "3d"} />
          </Suspense>
        </m.div>
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        {view === "2d" && (
          <m.div
            className="drawing-area"
            key={mode}
            data-mode={mode}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28 }}
          >
            <div
              className="drawing-scale"
              style={{
                transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
              }}
            >
              {mode === "shapes" ? (
                <ShapeCanvas ink={ink} />
              ) : design.text ? (
                <Lettering
                  design={design}
                  ink={ink}
                  livePaint
                  singleIndex={
                    mode === "symbol"
                      ? Math.min(selected, Math.max(0, design.text.length - 1))
                      : undefined
                  }
                  guides={guides}
                  onSelect={(index) => {
                    select(index);
                    if (mode !== "symbol") setMode("symbol");
                  }}
                  label={design.text}
                />
              ) : (
                <p className="empty-word">{t("empty")}</p>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

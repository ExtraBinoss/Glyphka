import { lazy, Suspense, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Box, Scan } from "lucide-react";
import {
  designAtom,
  renderDesignAtom,
  previewDesignAtom,
  modeAtom,
  selectedGlyphAtom,
  guidesAtom,
  zoomAtom,
  viewAtom,
  threeMountedAtom,
  threeApiAtom,
  threeDisplacedAtom,
  canvasModeAtom,
  canvasViewAtom,
  canvasSelectedGlyphAtom,
} from "@/state/studio";
import { buildMesh } from "@/engine/mesh-service";
import { loadThree } from "@/lib/preload-three";
import { useCanvasViewport } from "@/lib/use-canvas-viewport";
import { backToLettering } from "@/lib/use-studio-navigation";
import { Lettering } from "./Drawing";
import { ShapeCanvas } from "./ShapeCanvas";
import { Button } from "./ui/button";
const ThreeView = lazy(loadThree);
const MotionButton = m.create(Button);
export function CanvasView() {
  const mode = useAtomValue(canvasModeAtom),
    editorMode = useAtomValue(modeAtom),
    setMode = useSetAtom(modeAtom),
    design = useAtomValue(renderDesignAtom),
    preview = useAtomValue(previewDesignAtom),
    savedDesign = useAtomValue(designAtom),
    selected = useAtomValue(canvasSelectedGlyphAtom),
    savedSelected = useAtomValue(selectedGlyphAtom),
    select = useSetAtom(selectedGlyphAtom),
    guides = useAtomValue(guidesAtom),
    zoom = useAtomValue(zoomAtom),
    view = useAtomValue(canvasViewAtom),
    editorView = useAtomValue(viewAtom),
    mounted = useAtomValue(threeMountedAtom),
    threeApi = useAtomValue(threeApiAtom),
    threeDisplaced = useAtomValue(threeDisplacedAtom),
    { t } = useTranslation();
  const { host, drawing, recenter, canRecenter } = useCanvasViewport(
    editorMode,
    zoom,
    editorView,
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editorMode !== "about") {
        void loadThree().catch(() => {
          /* Explicit activation can retry. */
        });
        void buildMesh(savedDesign, editorMode, savedSelected, false).catch(
          () => {
            /* Optional prewarm. */
          },
        );
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [savedDesign, editorMode, savedSelected]);
  const ink = design.color === "auto" ? "var(--foreground)" : design.color;
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
              onClick={backToLettering}
            >
              <ArrowLeft />
              {t("back")}
            </Button>
          </m.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(view === "2d" ? canRecenter : threeDisplaced) && (
          <m.div
            className="canvas-recenter"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <MotionButton
              variant="outline"
              size="sm"
              onTap={(event) => {
                if ("pointerType" in event && event.pointerType === "touch") {
                  if (view === "2d") recenter();
                  else threeApi?.recenter();
                }
              }}
              onClick={view === "2d" ? recenter : () => threeApi?.recenter()}
            >
              <Scan />
              {t("recenterView")}
            </MotionButton>
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
            key={editorMode}
            data-mode={mode}
            initial={preview ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: preview ? 0 : 0.28 }}
          >
            <div
              ref={drawing}
              className="drawing-scale"
              style={{
                transform: `scale(${zoom / 100})`,
              }}
            >
              {mode === "shapes" ? (
                <ShapeCanvas ink={ink} />
              ) : design.text ? (
                <Lettering
                  morph={preview === null}
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

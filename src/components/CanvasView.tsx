import { lazy, Suspense } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";
import { Box } from "lucide-react";
import {
  designAtom,
  modeAtom,
  selectedGlyphAtom,
  guidesAtom,
  zoomAtom,
  viewAtom,
} from "@/state/studio";
import { Lettering } from "./Drawing";
import { ShapeCanvas } from "./ShapeCanvas";

const loadThree = () => import("./ThreeView");
const ThreeView = lazy(loadThree);
export const preloadThree = () => {
  void loadThree();
};

export function CanvasView() {
  const mode = useAtomValue(modeAtom),
    setMode = useSetAtom(modeAtom),
    design = useAtomValue(designAtom),
    selected = useAtomValue(selectedGlyphAtom),
    select = useSetAtom(selectedGlyphAtom),
    guides = useAtomValue(guidesAtom),
    zoom = useAtomValue(zoomAtom),
    view = useAtomValue(viewAtom),
    { t } = useTranslation();
  const ink = design.color === "auto" ? "var(--foreground)" : design.color;
  return (
    <div
      className={`canvas-area ${mode === "shapes" ? "composition-area" : ""}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {view === "3d" ? (
          <m.div
            className="three-canvas-transition"
            key="3d"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense
              fallback={
                <div className="three-status">
                  <Box />
                </div>
              }
            >
              <ThreeView />
            </Suspense>
          </m.div>
        ) : (
          <m.div
            className="drawing-area"
            key={mode}
            data-mode={mode}
            initial={{ opacity: 0, y: 15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 0.7, 0.2, 1] }}
          >
            <div
              className="drawing-scale"
              style={{ transform: `scale(${zoom / 100})` }}
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
                  selected={mode === "symbol" ? selected : undefined}
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

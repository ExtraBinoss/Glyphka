import { useEffect, useState } from "react";
import { getDefaultStore, useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Crosshair,
  Focus,
  Grid2X2,
  Minus,
  Plus,
  Redo2,
  Shapes,
  Dice5,
  Ellipsis,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { About } from "@/components/About";
import { BrandWord } from "@/components/BrandWord";
import { ResponsiveInspector } from "@/components/ResponsiveInspector";
import { serializeSvg } from "@/engine/geometry";
import { randomizeDesign } from "@/engine/randomize";
import {
  canRedoAtom,
  canUndoAtom,
  designAtom,
  textAtom,
  editAtom,
  endGestureAtom,
  commitPaintAtom,
  commitRenderAtom,
  commitGeometryAtom,
  commitShapeAtom,
  guidesAtom,
  modeAtom,
  redoAtom,
  selectedGlyphAtom,
  selectedShapeAtom,
  undoAtom,
  zoomAtom,
  viewAtom,
  threeApiAtom,
} from "@/state/studio";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CanvasView } from "@/components/CanvasView";
import { ControlHint } from "@/components/ControlHint";
import { AddShape, Properties } from "@/components/Properties";
import { Variations } from "@/components/Variations";
import { PresetControls } from "@/components/PresetControls";
import { PreferenceGroup } from "@/components/PreferenceGroup";
import { preloadThree } from "@/lib/preload-three";

import { download, exportPng } from "@/lib/export";
import { useThemeSync } from "@/state/theme";
import { useStudioNavigation } from "@/lib/use-studio-navigation";

function Navigation() {
  const { t } = useTranslation(),
    [mode, setMode] = useAtom(modeAtom),
    [expanded, setExpanded] = useState(false),
    reduced = useReducedMotion();
  return (
    <m.nav
      className="rail glass"
      aria-label={t("view")}
      onPointerEnter={(event) => {
        if (
          event.pointerType !== "touch" &&
          matchMedia("(min-width: 901px)").matches
        )
          setExpanded(true);
      }}
      onPointerLeave={() => setExpanded(false)}
      onFocusCapture={() => {
        if (matchMedia("(min-width: 901px)").matches) setExpanded(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setExpanded(false);
      }}
      initial={false}
      layout="size"
      style={{ width: expanded ? 158 : 58, y: "-50%", originX: 0 }}
      data-expanded={expanded}
      transition={{ duration: reduced ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      <m.span
        className="rail-indicator"
        aria-hidden="true"
        initial={false}
        animate={{
          "--nav-position": ["wordmark", "symbol", "shapes", "about"].indexOf(
            mode,
          ),
        }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 400, damping: 32 }
        }
      />
      {(
        [
          ["wordmark", Type],
          ["symbol", Crosshair],
          ["shapes", Shapes],
          ["about", CircleHelp],
        ] as const
      ).map(([id, Icon]) => (
        <m.button
          layout="position"
          key={id}
          aria-label={t(id)}
          aria-current={mode === id ? "page" : undefined}
          className={`rail-item ${mode === id ? "active" : ""}`}
          onTap={(event) => {
            if ("pointerType" in event && event.pointerType === "touch")
              setMode(id);
          }}
          onClick={() => setMode(id)}
        >
          <Icon size={21} />
          <m.span
            className="rail-label"
            style={{ visibility: expanded ? "visible" : "hidden" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
            transition={{
              duration: reduced ? 0 : expanded ? 0.14 : 0.07,
              delay: expanded && !reduced ? 0.065 : 0,
            }}
            aria-hidden="true"
          >
            {t(id)}
          </m.span>
        </m.button>
      ))}
    </m.nav>
  );
}
function ExportControls({ notify }: { notify: (message: string) => void }) {
  const { t } = useTranslation(),
    text = useAtomValue(textAtom),
    mode = useAtomValue(modeAtom),
    selected = useAtomValue(selectedGlyphAtom),
    view = useAtomValue(viewAtom),
    api = useAtomValue(threeApiAtom),
    [busy, setBusy] = useState(false);
  const source = () => {
    const design = getDefaultStore().get(designAtom);
    const ink =
      design.color === "auto"
        ? getComputedStyle(document.documentElement)
            .getPropertyValue("--foreground")
            .trim()
        : design.color;
    return serializeSvg(
      design,
      mode === "shapes" ? "shapes" : mode === "symbol" ? "symbol" : "wordmark",
      ink,
      Math.min(selected, Math.max(0, design.text.length - 1)),
    );
  };
  const filename = `${text.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "glyph"}-${mode}`;
  const svg = () =>
    download(
      new Blob([source()], { type: "image/svg+xml" }),
      `${filename}.svg`,
    );
  const png = async () => {
    setBusy(true);
    try {
      download(
        view === "3d" && api ? await api.png() : await exportPng(source()),
        `${filename}${view === "3d" ? "-3d" : ""}.png`,
      );
    } catch {
      notify(t("exportError"));
    }
    setBusy(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source());
      notify(t("copied"));
    } catch {
      notify(t("copyError"));
    }
  };
  return (
    <div className="exports">
      <ButtonGroup>
        <Button
          className="export-primary"
          onClick={view === "3d" ? () => void png() : svg}
          size="sm"
          disabled={busy || (view === "3d" && !api)}
        >
          <ArrowDownToLine />
          {view === "3d" ? "PNG" : t("svg")}
        </Button>
        <Popover>
          <ControlHint label={t("download")}>
            <PopoverTrigger
              render={<Button size="sm" />}
              className="export-menu"
              aria-label={t("download")}
            >
              <ChevronDown className="export-chevron" />
              <ArrowDownToLine className="export-mobile-icon" />
              <span className="export-mobile-label">{t("download")}</span>
            </PopoverTrigger>
          </ControlHint>
          <PopoverContent
            align="end"
            sideOffset={12}
            className="export-popover bg-popover/80 backdrop-blur-xl"
          >
            <PopoverTitle>{t("download")}</PopoverTitle>
            <Button variant="ghost" aria-label="SVG" onClick={svg}>
              <ArrowDownToLine />
              SVG<span className="muted">{t("vector")}</span>
            </Button>
            <Button
              variant="ghost"
              aria-label="PNG"
              onClick={() => void png()}
              disabled={busy || (view === "3d" && !api)}
            >
              <ArrowDownToLine />
              PNG<span className="muted">2×</span>
            </Button>
            <Button variant="ghost" onClick={() => void copy()}>
              <Copy />
              {t("copy")}
            </Button>
            <p className="micro muted">{t("transparent")}</p>
          </PopoverContent>
        </Popover>
      </ButtonGroup>
    </div>
  );
}
function Toolbar() {
  const { t } = useTranslation(),
    canUndo = useAtomValue(canUndoAtom),
    canRedo = useAtomValue(canRedoAtom),
    undo = useSetAtom(undoAtom),
    redo = useSetAtom(redoAtom),
    [guides, setGuides] = useAtom(guidesAtom),
    [zoom, setZoom] = useAtom(zoomAtom),
    mode = useAtomValue(modeAtom),
    [view, setView] = useAtom(viewAtom);
  return (
    <div className="canvas-toolbar glass">
      <div className="toolbar-primary">
        <div
          className="toolbar-view"
          onPointerOver={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest('button[aria-label="3D"]')
            )
              preloadThree();
          }}
          onFocus={(event) => {
            if (event.target.getAttribute("aria-label") === "3D")
              preloadThree();
          }}
        >
          <PreferenceGroup
            label={t("view")}
            value={view}
            options={[
              { value: "2d", label: "2D" },
              { value: "3d", label: "3D" },
            ]}
            onChange={(value) => setView(value as "2d" | "3d")}
          />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canUndo}
          aria-label={t("undo")}
          title={`${t("undo")} · ⌘Z`}
          onClick={() => undo()}
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canRedo}
          aria-label={t("redo")}
          title={`${t("redo")} · ⇧⌘Z`}
          onClick={() => redo()}
        >
          <Redo2 />
        </Button>
        <Button
          className="toolbar-guides"
          variant={guides ? "secondary" : "ghost"}
          size="icon-sm"
          aria-pressed={guides}
          aria-label={t("guides")}
          title={t("guides")}
          onClick={() => setGuides(!guides)}
        >
          <Grid2X2 />
        </Button>
      </div>
      <div className="toolbar-secondary">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("zoomOut")}
          disabled={zoom <= 25}
          onClick={() => setZoom(Math.max(25, zoom - 10))}
        >
          <Minus />
        </Button>
        <ControlHint label={t("resetZoom")}>
          <Button
            variant="ghost"
            size="sm"
            className="zoom-trigger"
            aria-label={t("resetZoom")}
            onClick={() => setZoom(100)}
          >
            {zoom}%
          </Button>
        </ControlHint>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("zoomIn")}
          disabled={zoom >= 400}
          onClick={() => setZoom(Math.min(400, zoom + 10))}
        >
          <Plus />
        </Button>
        {mode === "shapes" && (
          <>
            <span className="toolbar-separator" />
            <AddShape compact />
          </>
        )}
      </div>
      <Popover>
        <PopoverTrigger
          render={<Button variant="ghost" size="icon-sm" />}
          className="mobile-toolbar-more"
          aria-label={t("canvasControls")}
        >
          <Ellipsis />
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={12}
          className="canvas-controls-popover bg-popover/95 backdrop-blur-xl"
        >
          <PopoverTitle>{t("canvasControls")}</PopoverTitle>
          <ButtonGroup className="mobile-zoom-group" aria-label={t("zoom")}>
            <Button
              variant="outline"
              aria-label={t("zoomOut")}
              disabled={zoom <= 25}
              onClick={() => setZoom(Math.max(25, zoom - 10))}
            >
              <Minus />
            </Button>
            <Button
              variant="outline"
              aria-label={t("resetZoom")}
              onClick={() => setZoom(100)}
            >
              {zoom}%
            </Button>
            <Button
              variant="outline"
              aria-label={t("zoomIn")}
              disabled={zoom >= 400}
              onClick={() => setZoom(Math.min(400, zoom + 10))}
            >
              <Plus />
            </Button>
          </ButtonGroup>
          <Button
            variant={guides ? "secondary" : "ghost"}
            aria-label={t("guides")}
            aria-pressed={guides}
            onClick={() => setGuides(!guides)}
          >
            <Grid2X2 />
            {t("guides")}
          </Button>
          {mode === "shapes" && <AddShape />}
        </PopoverContent>
      </Popover>
    </div>
  );
}
export function App() {
  useThemeSync();
  useStudioNavigation();
  const { t } = useTranslation(),
    [mode] = useAtom(modeAtom),
    edit = useSetAtom(editAtom),
    selectedShape = useAtomValue(selectedShapeAtom),
    undo = useSetAtom(undoAtom),
    redo = useSetAtom(redoAtom),
    end = useSetAtom(endGestureAtom),
    commitPaint = useSetAtom(commitPaintAtom),
    commitRender = useSetAtom(commitRenderAtom),
    commitGeometry = useSetAtom(commitGeometryAtom),
    commitShape = useSetAtom(commitShapeAtom),
    view = useAtomValue(viewAtom);
  const [roll, setRoll] = useState(0);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const finish = () => {
      commitPaint();
      commitRender();
      commitGeometry();
      commitShape();
      end();
    };
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'input,textarea,[contenteditable="true"],[role="slider"]',
        )
      )
        return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (mode === "shapes" && selectedShape) {
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          edit((design) => ({
            ...design,
            shapes: design.shapes.filter((s) => s.id !== selectedShape),
          }));
        }
        const direction = (
          {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
          } as Record<string, number[]>
        )[event.key];
        if (direction) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          edit((design) => ({
            ...design,
            shapes: design.shapes.map((s) =>
              s.id === selectedShape
                ? {
                    ...s,
                    x: Math.max(0, Math.min(600, s.x + direction[0] * step)),
                    y: Math.max(0, Math.min(440, s.y + direction[1] * step)),
                  }
                : s,
            ),
          }));
        }
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("blur", finish);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", finish);
    };
  }, [
    mode,
    selectedShape,
    edit,
    undo,
    redo,
    end,
    commitPaint,
    commitRender,
    commitGeometry,
    commitShape,
  ]);
  return (
    <div className={`studio mode-${mode} view-${view}`}>
      <Navigation />
      <header className="studio-header">
        <h1 className="word-logo" aria-label="Glyphka">
          <BrandWord />
        </h1>
      </header>
      {mode !== "about" && (
        <div className="top-actions">
          <Button
            variant="ghost"
            className="dice-button"
            aria-label={t("generate")}
            title={t("generate")}
            size="icon-sm"
            onClick={() => {
              setRoll(roll + 1);
              edit((design) =>
                randomizeDesign(design, Math.floor(Math.random() * 999999)),
              );
            }}
          >
            <m.span
              animate={{ rotate: roll * 180 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <Dice5 />
            </m.span>
          </Button>
          <PresetControls />
          <ExportControls notify={setToast} />
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        {mode === "about" ? (
          <About key="about" />
        ) : (
          <m.main
            key="editor"
            className="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CanvasView />
            {mode !== "shapes" && <Variations />}
            <Toolbar />
          </m.main>
        )}
      </AnimatePresence>
      {mode !== "about" && (
        <ResponsiveInspector
          title={t("settings")}
          closeLabel={t("close")}
          breakpoint={900}
        >
          <Properties />
        </ResponsiveInspector>
      )}
      <AnimatePresence>
        {toast && (
          <m.div
            className="toast glass"
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
          >
            <Check size={16} />
            {toast}
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t("close")}
              onClick={() => setToast("")}
            >
              <X />
            </Button>
          </m.div>
        )}
      </AnimatePresence>
      <span className="sr-only">
        <Focus />
      </span>
    </div>
  );
}

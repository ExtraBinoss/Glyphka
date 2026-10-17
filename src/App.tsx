import { lazy, Suspense, useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, m } from "motion/react";
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
  Maximize2,
  Redo2,
  Shapes,
  SlidersHorizontal,
  Dice5,
  Box,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { About } from "@/components/About";
import { serializeSvg } from "@/engine/geometry";
import { generateComposition } from "@/engine/generate";
import {
  canRedoAtom,
  canUndoAtom,
  designAtom,
  editAtom,
  endGestureAtom,
  guidesAtom,
  modeAtom,
  redoAtom,
  selectedGlyphAtom,
  selectedShapeAtom,
  undoAtom,
  zoomAtom,
  viewAtom,
  renderPanelAtom,
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
import { Lettering } from "@/components/Drawing";
import { ShapeCanvas } from "@/components/ShapeCanvas";
import { AddShape, Properties } from "@/components/Properties";
import { Variations } from "@/components/Variations";
import { generateVariations } from "@/components/Variations";

import { RangeField } from "@/components/RangeField";
import { download, exportPng } from "@/lib/export";
import { useThemeSync } from "@/state/theme";
import { PreferenceGroup } from "@/components/PreferenceGroup";
const loadThree = () => import("@/components/ThreeView");
const ThreeView = lazy(loadThree);
function ViewToggle() {
  const { t } = useTranslation(),
    [view, setView] = useAtom(viewAtom),
    setPanel = useSetAtom(renderPanelAtom);
  return (
    <div className="view-toggle" onPointerEnter={() => void loadThree()}>
      <PreferenceGroup
        label={t("view")}
        value={view}
        options={[
          { value: "2d", label: "2D" },
          { value: "3d", label: "3D", Icon: Box },
        ]}
        onChange={(value) => {
          setView(value as "2d" | "3d");
          setPanel(value === "3d");
        }}
      />
    </div>
  );
}

function Navigation() {
  const { t } = useTranslation(),
    [mode, setMode] = useAtom(modeAtom),
    [expanded, setExpanded] = useState(false);
  return (
    <m.nav
      className="rail glass"
      aria-label={t("view")}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setExpanded(false);
      }}
      animate={{ width: expanded ? 158 : 58 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    >
      {(
        [
          ["wordmark", Type],
          ["symbol", Crosshair],
          ["shapes", Shapes],
          ["about", CircleHelp],
        ] as const
      ).map(([id, Icon]) => (
        <button
          key={id}
          aria-label={t(id)}
          aria-current={mode === id ? "page" : undefined}
          className={`rail-item ${mode === id ? "active" : ""}`}
          onClick={() => setMode(id)}
        >
          {mode === id && (
            <m.span
              className="rail-indicator"
              layoutId="rail-selection"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <Icon size={21} />
          <m.span
            className="rail-label"
            animate={{ opacity: expanded ? 1 : 0 }}
          >
            {t(id)}
          </m.span>
        </button>
      ))}
    </m.nav>
  );
}
function ExportControls({ notify }: { notify: (message: string) => void }) {
  const { t } = useTranslation(),
    design = useAtomValue(designAtom),
    mode = useAtomValue(modeAtom),
    selected = useAtomValue(selectedGlyphAtom),
    view = useAtomValue(viewAtom),
    api = useAtomValue(threeApiAtom),
    [busy, setBusy] = useState(false);
  const source = () => {
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
  const filename = `${design.text.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "glyph"}-${mode}`;
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
    } finally {
      setBusy(false);
    }
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
          onClick={view === "3d" ? () => void png() : svg}
          size="sm"
          disabled={busy || (view === "3d" && !api)}
        >
          <ArrowDownToLine />
          {view === "3d" ? "PNG" : t("svg")}
        </Button>
        <Popover>
          <PopoverTrigger
            render={<Button size="sm" />}
            className="export-menu"
            aria-label={t("download")}
          >
            <ChevronDown />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={12}
            className="export-popover bg-popover/80 backdrop-blur-xl"
          >
            <PopoverTitle>{t("download")}</PopoverTitle>
            <Button variant="ghost" onClick={svg}>
              <ArrowDownToLine />
              SVG<span className="muted">Vector</span>
            </Button>
            <Button
              variant="ghost"
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
    view = useAtomValue(viewAtom),
    api = useAtomValue(threeApiAtom);
  return (
    <div className="canvas-toolbar glass">
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
      <span className="toolbar-separator" />
      <Button
        variant={guides ? "secondary" : "ghost"}
        size="icon-sm"
        aria-pressed={guides}
        aria-label={t("guides")}
        title={t("guides")}
        onClick={() => setGuides(!guides)}
      >
        <Grid2X2 />
      </Button>
      <Popover>
        <PopoverTrigger
          render={<Button variant="ghost" size="sm" />}
          className="zoom-trigger"
          aria-label={t("zoom")}
        >
          {zoom}%
        </PopoverTrigger>
        <PopoverContent
          side="top"
          sideOffset={14}
          className="zoom-popover bg-popover/80 backdrop-blur-xl"
        >
          <RangeField
            label={t("zoom")}
            value={zoom}
            min={50}
            max={160}
            unit="%"
            initial={100}
            onChange={(value) => {
              setZoom(value);
              if (view === "3d") api?.zoom(value);
            }}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("fit")}
        title={t("fit")}
        onClick={() => {
          setZoom(100);
          if (view === "3d") api?.reset();
        }}
      >
        <Maximize2 />
      </Button>
      {mode === "shapes" && (
        <>
          <span className="toolbar-separator" />
          <AddShape />
        </>
      )}
    </div>
  );
}
export function App() {
  useThemeSync();
  const { t } = useTranslation(),
    [mode] = useAtom(modeAtom),
    design = useAtomValue(designAtom),
    edit = useSetAtom(editAtom),
    [selected, setSelected] = useAtom(selectedGlyphAtom),
    selectedShape = useAtomValue(selectedShapeAtom),
    guides = useAtomValue(guidesAtom),
    zoom = useAtomValue(zoomAtom),
    undo = useSetAtom(undoAtom),
    redo = useSetAtom(redoAtom),
    end = useSetAtom(endGestureAtom),
    view = useAtomValue(viewAtom);
  const [roll, setRoll] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false),
    [toast, setToast] = useState("");
  const ink = design.color === "auto" ? "var(--foreground)" : design.color;
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const finish = () => end();
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
          edit({ shapes: design.shapes.filter((s) => s.id !== selectedShape) });
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
          edit({
            shapes: design.shapes.map((s) =>
              s.id === selectedShape
                ? {
                    ...s,
                    x: Math.max(0, Math.min(600, s.x + direction[0] * step)),
                    y: Math.max(0, Math.min(440, s.y + direction[1] * step)),
                  }
                : s,
            ),
          });
        }
      }
      if (event.key === "Escape") setPanelOpen(false);
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
  }, [mode, selectedShape, design.shapes, edit, undo, redo, end]);
  const currentMode = mode === "about" ? "wordmark" : mode;
  return (
    <div
      className={`studio mode-${mode} view-${view} ${panelOpen ? "panel-open" : ""}`}
    >
      <Navigation />
      <header className="studio-header">
        <a
          className="word-logo"
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-label="Glyphka"
        >
          glyphka<span>.</span>
        </a>
        <span className="studio-title">{t("studio")}</span>
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
              edit(
                mode === "shapes"
                  ? {
                      shapes: generateComposition(
                        Math.floor(Math.random() * 999999),
                      ),
                    }
                  : generateVariations(
                      design,
                      Math.floor(Math.random() * 999999),
                    )[0],
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
          <ExportControls notify={setToast} />
          <Button
            variant="outline"
            size="icon-sm"
            className="mobile-properties"
            aria-label={t("settings")}
            onClick={() => setPanelOpen(!panelOpen)}
          >
            <SlidersHorizontal />
          </Button>
        </div>
      )}
      <AnimatePresence mode="wait">
        {mode === "about" ? (
          <About key="about" />
        ) : (
          <m.main
            key="editor"
            className="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className={`canvas-area ${mode === "shapes" ? "composition-area" : ""}`}
            >
              <div className="canvas-meta">
                <span>{t(currentMode)}</span>
                <span>
                  {mode === "shapes"
                    ? String(design.shapes.length).padStart(2, "0")
                    : design.text || "—"}
                </span>
                <ViewToggle />
              </div>
              {view === "3d" ? (
                <Suspense
                  fallback={
                    <div className="three-status">
                      <Box />
                    </div>
                  }
                >
                  <ThreeView />
                </Suspense>
              ) : (
                <m.div
                  className="drawing-area"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
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
                        singleIndex={
                          mode === "symbol"
                            ? Math.min(
                                selected,
                                Math.max(0, design.text.length - 1),
                              )
                            : undefined
                        }
                        guides={guides}
                        selected={selected}
                        onSelect={setSelected}
                        label={design.text}
                      />
                    ) : (
                      <p className="empty-word">{t("empty")}</p>
                    )}
                  </div>
                </m.div>
              )}
              <p className="canvas-hint">
                {view === "3d"
                  ? t("orbitHint")
                  : mode === "shapes"
                    ? t("dragHint")
                    : mode === "symbol"
                      ? t("symbolHint")
                      : t("selectHint")}
              </p>
            </div>
            {mode !== "shapes" && <Variations />}
            <Toolbar />
          </m.main>
        )}
      </AnimatePresence>
      {mode !== "about" && (
        <>
          <button
            className="panel-scrim"
            aria-label={t("close")}
            onClick={() => setPanelOpen(false)}
          />
          <Properties onClose={() => setPanelOpen(false)} />
        </>
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

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Plus,
  RotateCcw,
  Trash2,
  X,
  Dice5,
} from "lucide-react";
import {
  DEFAULT_DESIGN,
  normalizeText,
  FAMILIES,
  LIMITS,
  PRESETS,
  SHAPE_KINDS,
  type Design,
  type GeometryKey,
  type Shape,
  type ShapeKind,
} from "@/engine/model";
import {
  designAtom,
  editAtom,
  modeAtom,
  selectedGlyphAtom,
  selectedShapeAtom,
  viewAtom,
} from "@/state/studio";
import { Lettering, ShapeMark } from "./Drawing";
import { serializeSvg, random } from "@/engine/geometry";
import { RangeField } from "./RangeField";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { ButtonGroup } from "./ui/button-group";
import { Input } from "./ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";
import { InkPicker } from "./InkPicker";
import { RenderProperties } from "./RenderProperties";
import { ScrollShadow } from "./ScrollShadow";
import { ControlHint } from "./ControlHint";

// Family samples are independent from live slider values and contain no
// animation subscriptions. CSS masks preserve their currentColor tint.
const familyImages = Object.fromEntries(
  FAMILIES.map((family) => [
    family,
    `url("data:image/svg+xml,${encodeURIComponent(serializeSvg({ ...DEFAULT_DESIGN, ...PRESETS[family], text: "PA", alternates: {} }, "wordmark", "#000000"))}")`,
  ]),
);

function randomShapeParameters(): Partial<Shape> {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647,
    rng = random(seed);
  return {
    seed,
    points: 3 + Math.floor(rng() * 12),
    inner: 0.15 + rng() * 0.65,
    tension: 0.4 + rng() * 4,
    twist: -90 + rng() * 180,
    irregularity: rng() * 0.6,
    width: 85 + rng() * 170,
    height: 85 + rng() * 170,
    rotation: Math.round(-90 + rng() * 180),
  };
}
const SHAPE_FIELDS: {
  key: "points" | "inner" | "tension" | "twist" | "irregularity" | "thickness";
  min: number;
  max: number;
  step?: number;
  fallback: number;
  kinds: string[];
}[] = [
  {
    key: "points",
    min: 3,
    max: 24,
    fallback: 5,
    kinds: [
      "polygon",
      "star",
      "clover",
      "rosette",
      "superformula",
      "scallop",
      "spiral",
      "wave",
    ],
  },
  {
    key: "inner",
    min: 0.08,
    max: 0.95,
    step: 0.01,
    fallback: 0.48,
    kinds: ["star", "cross", "rosette", "superformula"],
  },
  {
    key: "tension",
    min: 0.2,
    max: 8,
    step: 0.05,
    fallback: 2,
    kinds: ["capsule", "superformula"],
  },
  {
    key: "twist",
    min: -180,
    max: 180,
    fallback: 0,
    kinds: ["clover", "blob", "rosette", "superformula", "scallop"],
  },
  {
    key: "irregularity",
    min: 0,
    max: 0.7,
    step: 0.01,
    fallback: 0,
    kinds: ["clover", "blob", "rosette", "superformula", "scallop"],
  },
  {
    key: "thickness",
    min: 0.04,
    max: 0.48,
    step: 0.01,
    fallback: 0.26,
    kinds: ["ring", "arc", "spiral", "wave"],
  },
];

export function AddShape({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation(),
    edit = useSetAtom(editAtom),
    select = useSetAtom(selectedShapeAtom);
  const design = useAtomValue(designAtom);
  const add = (kind: ShapeKind, generated = false) => {
    const id = crypto.randomUUID();
    const shape: Shape = {
      id,
      kind,
      x: 300 + (design.shapes.length % 4) * 12,
      y: 220 + (design.shapes.length % 3) * 12,
      width: kind === "capsule" ? 140 : 100,
      height: kind === "capsule" ? 38 : 100,
      rotation: 0,
      cutout: false,
      seed: parseInt(id.replaceAll("-", "").slice(0, 8), 16) % 2147483647,
      points: 5,
      inner: 0.48,
      tension: 2,
      twist: 0,
      irregularity: 0,
      thickness: 0.26,
    };
    if (generated) Object.assign(shape, randomShapeParameters());
    edit({ ...design, shapes: [...design.shapes, shape] });
    select(id);
  };
  return (
    <Popover>
      <ControlHint label={t("addShape")} enabled={compact}>
        <PopoverTrigger
          render={
            <Button
              variant={compact ? "ghost" : "outline"}
              size={compact ? "icon-sm" : "sm"}
            />
          }
          aria-label={t("addShape")}
        >
          <Plus />
          {!compact && t("addShape")}
        </PopoverTrigger>
      </ControlHint>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="shape-popover bg-popover/80 backdrop-blur-xl"
      >
        <PopoverTitle>{t("addShape")}</PopoverTitle>
        <Button
          variant="secondary"
          className="generate-shape"
          onClick={() => add("superformula", true)}
        >
          <Dice5 />
          {t("addGenerated")}
        </Button>
        <ScrollShadow className="shape-grid" label={t("shapes")}>
          {SHAPE_KINDS.map((kind) => (
            <Button key={kind} variant="ghost" onClick={() => add(kind)}>
              <svg viewBox="-60 -60 120 120" aria-hidden="true">
                <ShapeMark
                  shape={{
                    id: "preview",
                    kind,
                    x: 0,
                    y: 0,
                    width: 80,
                    height: kind === "capsule" ? 28 : 80,
                    rotation: 0,
                    cutout: false,
                  }}
                  weight={23}
                />
              </svg>
              <span>{t(kind)}</span>
            </Button>
          ))}
        </ScrollShadow>
      </PopoverContent>
    </Popover>
  );
}
function ShapeProperties() {
  const { t } = useTranslation(),
    design = useAtomValue(designAtom),
    edit = useSetAtom(editAtom),
    [selected, setSelected] = useAtom(selectedShapeAtom);
  const shape = design.shapes.find((s) => s.id === selected);
  const update = (patch: Partial<Shape>) =>
    edit((prev) => ({
      ...prev,
      shapes: prev.shapes.map((s) =>
        s.id === selected ? { ...s, ...patch } : s,
      ),
    }));
  const duplicate = () => {
    if (!shape) return;
    const id = crypto.randomUUID();
    edit({
      shapes: [
        ...design.shapes,
        {
          ...shape,
          id,
          x: Math.min(600, shape.x + 20),
          y: Math.min(440, shape.y + 20),
        },
      ],
    });
    setSelected(id);
  };
  const remove = () => {
    edit({ shapes: design.shapes.filter((s) => s.id !== selected) });
    setSelected(null);
  };
  const reorder = (direction: number) => {
    const arr = [...design.shapes],
      i = arr.findIndex((s) => s.id === selected),
      to = Math.max(0, Math.min(arr.length - 1, i + direction));
    if (i < 0) return;
    [arr[i], arr[to]] = [arr[to], arr[i]];
    edit({ shapes: arr });
  };
  return (
    <>
      <section className="panel-section">
        <div className="section-heading">
          <h3>
            {t("layers")}
            <span className="count">{design.shapes.length}</span>
          </h3>
          <AddShape />
        </div>
        <ScrollShadow className="layers" label={t("layers")}>
          {[...design.shapes].reverse().map((s, i) => (
            <button
              key={s.id}
              className={`layer ${selected === s.id ? "active" : ""}`}
              onClick={() => setSelected(s.id)}
            >
              <svg viewBox="-60 -60 120 120" aria-hidden="true">
                <ShapeMark
                  shape={{
                    ...s,
                    width: 80,
                    height: s.kind === "capsule" ? 28 : 80,
                  }}
                  weight={23}
                />
              </svg>
              <span>{t(s.kind)}</span>
              <small>
                {s.cutout
                  ? "−"
                  : String(design.shapes.length - i).padStart(2, "0")}
              </small>
            </button>
          ))}
        </ScrollShadow>
      </section>
      {shape ? (
        <section className="panel-section">
          <div className="section-heading">
            <h3>{t(shape.kind)}</h3>
            <ButtonGroup>
              <Button
                variant="ghost"
                size="icon-sm"
                title={t("moveDown")}
                aria-label={t("moveDown")}
                onClick={() => reorder(-1)}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title={t("moveUp")}
                aria-label={t("moveUp")}
                onClick={() => reorder(1)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title={t("duplicate")}
                aria-label={t("duplicate")}
                onClick={duplicate}
              >
                <Copy />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title={t("remove")}
                aria-label={t("remove")}
                onClick={remove}
              >
                <Trash2 />
              </Button>
            </ButtonGroup>
          </div>
          <ButtonGroup className="fill-group">
            <Button
              variant={shape.cutout ? "secondary" : "default"}
              size="sm"
              onClick={() => update({ cutout: false })}
              aria-pressed={!shape.cutout}
            >
              {t("solid")}
            </Button>
            <Button
              variant={shape.cutout ? "default" : "secondary"}
              size="sm"
              onClick={() => update({ cutout: true })}
              aria-pressed={shape.cutout}
            >
              {t("cut")}
            </Button>
          </ButtonGroup>
          <div className="geometry-fields">
            <ScrollShadow className="shape-kind-select" label={t("shapes")}>
              {SHAPE_KINDS.map((kind) => (
                <button
                  key={kind}
                  className={shape.kind === kind ? "active" : ""}
                  aria-label={t(kind)}
                  title={t(kind)}
                  onClick={() => update({ kind })}
                >
                  <svg viewBox="-60 -60 120 120">
                    <ShapeMark
                      shape={{ ...shape, kind, width: 80, height: 80 }}
                      weight={23}
                    />
                  </svg>
                </button>
              ))}
            </ScrollShadow>
            <RangeField
              label={t("width")}
              value={shape.width}
              min={12}
              max={280}
              onChange={(width) => update({ width })}
            />
            <RangeField
              label={t("height")}
              value={shape.height}
              min={12}
              max={280}
              onChange={(height) => update({ height })}
            />
            <RangeField
              label={t("rotate")}
              value={shape.rotation}
              min={-180}
              max={180}
              initial={0}
              unit="°"
              onChange={(rotation) => update({ rotation })}
            />
            <RangeField
              label="X"
              value={shape.x}
              min={0}
              max={600}
              onChange={(x) => update({ x })}
            />
            <RangeField
              label="Y"
              value={shape.y}
              min={0}
              max={440}
              onChange={(y) => update({ y })}
            />
          </div>
          <div className="geometry-fields procedural-fields">
            {SHAPE_FIELDS.filter((field) =>
              field.kinds.includes(shape.kind),
            ).map((field) => (
              <RangeField
                key={field.key}
                label={t(field.key)}
                value={shape[field.key] ?? field.fallback}
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                unit={field.key === "twist" ? "°" : ""}
                onChange={(value) => update({ [field.key]: value })}
              />
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="random-part"
            onClick={() => update(randomShapeParameters())}
          >
            <Dice5 />
            {t("randomizePart")}
          </Button>
          <p className="muted micro">{t("deleteHint")}</p>
        </section>
      ) : (
        <p className="empty-selection">{t("addHint")}</p>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="clear-composition"
        onClick={() => {
          edit({ shapes: [] });
          setSelected(null);
        }}
        disabled={!design.shapes.length}
      >
        <Trash2 />
        {t("clearShapes")}
      </Button>
    </>
  );
}
export function Properties({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(),
    design = useAtomValue(designAtom),
    edit = useSetAtom(editAtom),
    mode = useAtomValue(modeAtom),
    setMode = useSetAtom(modeAtom),
    [selected, setSelected] = useAtom(selectedGlyphAtom),
    view = useAtomValue(viewAtom);
  const alternateBase = Math.floor((design.alternates[selected] ?? 0) / 4) * 4;
  const safeSelected = Math.min(selected, Math.max(0, design.text.length - 1));
  const change = (key: GeometryKey, value: number) =>
    edit({ [key]: value } as Partial<Design>);
  return (
    <aside className="properties glass" aria-label={t("settings")}>
      <header className="panel-header">
        <h2>{t(mode)}</h2>
        <div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("reset")}
            title={t("resetTitle")}
            onClick={() =>
              edit(
                mode === "shapes"
                  ? { shapes: structuredClone(DEFAULT_DESIGN.shapes) }
                  : { ...PRESETS.signal, alternates: {} },
              )
            }
          >
            <RotateCcw />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="panel-close"
            aria-label={t("close")}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      </header>
      <ScrollShadow className="panel-scroll" label={t("settings")}>
        <AnimatePresence initial={false}>
          {view === "3d" && (
            <m.div
              key="render"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
              className="render-properties-motion"
            >
              <RenderProperties />
            </m.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
          >
            {mode === "shapes" ? (
              <ShapeProperties />
            ) : (
              <>
                <section className="panel-section text-section">
                  <label htmlFor="word-input">{t("text")}</label>
                  <Input
                    id="word-input"
                    value={design.text}
                    onChange={(e) => {
                      const text = normalizeText(e.target.value);
                      edit({ text });
                      if (selected >= text.length)
                        setSelected(Math.max(0, text.length - 1));
                    }}
                    maxLength={36}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="PLINKA"
                  />
                </section>
                <section className="panel-section">
                  <h3>
                    {t("family")}
                    <span className="count"> {FAMILIES.length}</span>
                  </h3>
                  <ScrollShadow className="families" label={t("family")}>
                    {FAMILIES.map((family) => (
                      <button
                        key={family}
                        className={`family ${family === design.family ? "active" : ""}`}
                        aria-pressed={family === design.family}
                        onClick={() =>
                          edit({ ...PRESETS[family], alternates: {} })
                        }
                      >
                        <i
                          className="family-preview"
                          aria-hidden
                          style={{
                            maskImage: familyImages[family],
                            WebkitMaskImage: familyImages[family],
                          }}
                        />
                        <span>{t(family)}</span>
                      </button>
                    ))}
                  </ScrollShadow>
                </section>
                <Accordion
                  className="properties-accordion"
                  multiple
                  defaultValue={["geometry", "letter"]}
                >
                  <AccordionItem value="geometry">
                    <AccordionTrigger>{t("geometry")}</AccordionTrigger>
                    <AccordionContent>
                      <div className="geometry-fields">
                        {(Object.keys(LIMITS) as GeometryKey[]).map((key) => (
                          <RangeField
                            key={key}
                            label={t(key)}
                            value={design[key]}
                            min={LIMITS[key][0]}
                            max={LIMITS[key][1]}
                            initial={PRESETS[design.family][key] as number}
                            unit={
                              key === "slant"
                                ? "°"
                                : key === "roundness" || key === "cutouts"
                                  ? "%"
                                  : ""
                            }
                            onChange={(value) => change(key, value)}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="letter">
                    <AccordionTrigger>{t("selectedLetter")}</AccordionTrigger>
                    <AccordionContent>
                      <div className="letter-variant-header">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("newDrawing")}
                          onClick={() =>
                            edit({
                              alternates: {
                                ...design.alternates,
                                [safeSelected]: alternateBase + 4,
                              },
                            })
                          }
                        >
                          <Dice5 />
                          {t("newDrawing")}
                        </Button>
                      </div>
                      <div className="letter-strip">
                        {Array.from(design.text).map((char, index) => (
                          <Button
                            key={index}
                            variant={
                              safeSelected === index ? "default" : "ghost"
                            }
                            size="icon-sm"
                            aria-label={`${t("selection")} ${char} ${index + 1}`}
                            onClick={() => {
                              setSelected(index);
                              setMode("symbol");
                            }}
                          >
                            {char === " " ? "·" : char}
                          </Button>
                        ))}
                      </div>
                      {design.text[safeSelected] && (
                        <div className="alternates">
                          {[0, 1, 2, 3]
                            .map((i) => alternateBase + i)
                            .map((v) => (
                              <button
                                key={v}
                                className={`alternate ${(design.alternates[safeSelected] ?? 0) === v ? "active" : ""}`}
                                aria-label={`${t("alternate")} ${v + 1}`}
                                aria-pressed={
                                  (design.alternates[safeSelected] ?? 0) === v
                                }
                                onClick={() =>
                                  edit({
                                    alternates: {
                                      ...design.alternates,
                                      [safeSelected]: v,
                                    },
                                  })
                                }
                              >
                                <Lettering
                                  design={{
                                    ...design,
                                    text: design.text[safeSelected],
                                    alternates: { 0: v },
                                  }}
                                  singleIndex={0}
                                />
                                <span>{String(v + 1).padStart(2, "0")}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            )}
          </m.div>
        </AnimatePresence>
        <InkPicker />
      </ScrollShadow>
    </aside>
  );
}

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  type PointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import {
  beginGestureAtom,
  renderDesignAtom,
  commitShapeAtom,
  shapePreviewAtom,
  endGestureAtom,
  guidesAtom,
  selectedShapeAtom,
  previewDesignAtom,
} from "@/state/studio";
import { shapePath } from "@/engine/geometry";
import type { Shape } from "@/engine/model";

import {
  drawShapeGesture,
  shapeGestureTargets,
  transformShape,
  type ShapeAction,
} from "@/lib/shape-gesture";
import { recordPerformance } from "@/lib/performance";
type Drag = {
  shape: Shape;
  latest: Shape;
  origin: DOMPoint;
  inverse: DOMMatrix;
  action: ShapeAction;
  pointerId: number;
  corner?: [number, number];
  targets?: ReturnType<typeof shapeGestureTargets>;
};
import { MorphPath } from "./MorphSvg";
import { SvgPaint } from "./SvgPaint";

export function ShapeCanvas({ ink }: { ink: string }) {
  const { t } = useTranslation();
  const design = useAtomValue(renderDesignAtom),
    scenePreview = useAtomValue(previewDesignAtom),
    guides = useAtomValue(guidesAtom),
    [selected, setSelected] = useAtom(selectedShapeAtom);
  const preview = useSetAtom(shapePreviewAtom),
    commit = useSetAtom(commitShapeAtom),
    begin = useSetAtom(beginGestureAtom),
    end = useSetAtom(endGestureAtom);
  const store = useStore();
  const Path = scenePreview ? "path" : MorphPath;
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<Drag | null>(null);
  const propertyFrame = useRef(0);
  useEffect(() => {
    let targets: ReturnType<typeof shapeGestureTargets> | undefined;
    let id = "";
    return store.sub(shapePreviewAtom, () => {
      const shape = store.get(shapePreviewAtom);
      if (!shape || drag.current || !svg.current) return;
      if (id !== shape.id || !targets) {
        id = shape.id;
        targets = shapeGestureTargets(svg.current, id);
      }
      drawShapeGesture(targets, shape, design.weight, true);
    });
  }, [store, design.weight, design.shapes]);
  const finish = useCallback(() => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    if (svg.current?.hasPointerCapture(current.pointerId))
      svg.current.releasePointerCapture(current.pointerId);
    cancelAnimationFrame(propertyFrame.current);
    propertyFrame.current = 0;
    preview(current.latest);
    commit();
    end();
  }, [preview, commit, end]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z")
      )
        finish();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", finish);
    return () => {
      window.removeEventListener("blur", finish);
      window.removeEventListener("keydown", onKey);
      finish();
    };
  }, [finish]);
  function start(
    event: PointerEvent,
    shape: Shape,
    action: Drag["action"] = "move",
    corner?: [number, number],
  ) {
    if (event.button !== 0 || drag.current) return;
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return;
    event.stopPropagation();
    if (event.pointerType !== "touch") event.preventDefault();
    const inverse = matrix.inverse();
    const origin = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      inverse,
    );
    drag.current = {
      shape,
      latest: shape,
      origin,
      inverse,
      action,
      corner,
      pointerId: event.pointerId,
    };
    setSelected(shape.id);
    svg.current!.setPointerCapture(event.pointerId);
    begin();
  }
  function move(event: PointerEvent) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const started = performance.now();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      current.inverse,
    );
    const shape = transformShape(
      current.shape,
      current.action,
      current.origin,
      point,
      event.shiftKey,
      current.corner,
    );
    if (!current.targets)
      current.targets = shapeGestureTargets(svg.current!, shape.id);
    current.latest = shape;
    drawShapeGesture(
      current.targets,
      shape,
      design.weight,
      current.action === "resize",
    );
    if (!propertyFrame.current)
      propertyFrame.current = requestAnimationFrame(() => {
        propertyFrame.current = 0;
        if (drag.current) preview(drag.current.latest);
      });
    recordPerformance("shapes:gesture", started);
  }
  return (
    <svg
      ref={svg}
      className="shape-canvas"
      viewBox="0 0 600 440"
      aria-label={t("composition")}
      role="img"
      onPointerDown={() => setSelected(null)}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
    >
      {guides && (
        <g stroke="var(--primary)" strokeWidth=".5" opacity=".25">
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d={`M${i * 40} 0V440M0 ${i * 40}H600`} />
          ))}
        </g>
      )}
      <SvgPaint width={600} height={440}>
        <g fill={ink} style={{ fill: "var(--glyph-paint)" }}>
          {design.shapes
            .filter((s) => !s.cutout)
            .map((s) => (
              <Path
                key={s.id}
                data-shape-paint={s.id}
                d={shapePath(s, design.weight)}
                transform={`translate(${s.x} ${s.y}) rotate(${s.rotation})`}
                fillRule="evenodd"
              />
            ))}
        </g>
        <g fill="black">
          {design.shapes
            .filter((shape) => shape.cutout)
            .map((shape) => (
              <Path
                key={shape.id}
                data-shape-paint={shape.id}
                d={shapePath(shape, design.weight)}
                transform={`translate(${shape.x} ${shape.y}) rotate(${shape.rotation})`}
                fillRule="evenodd"
              />
            ))}
        </g>
      </SvgPaint>
      {!scenePreview &&
        design.shapes.map((s) => (
          <ShapeOverlay
            key={s.id}
            shape={s}
            weight={design.weight}
            selected={selected === s.id}
            onStart={start}
          />
        ))}
    </svg>
  );
}

function ShapeOverlay({
  shape: s,
  weight,
  selected,
  onStart,
}: {
  shape: Shape;
  weight: number;
  selected: boolean;
  onStart: (
    event: PointerEvent,
    shape: Shape,
    action?: Drag["action"],
    corner?: [number, number],
  ) => void;
}) {
  return (
    <g
      transform={`translate(${s.x} ${s.y}) rotate(${s.rotation})`}
      className="draggable-shape"
      data-shape-id={s.id}
      onPointerDown={(e) => onStart(e, s)}
    >
      <path
        d={shapePath(s, weight)}
        fill="transparent"
        fillRule="evenodd"
        stroke="transparent"
        strokeWidth="8"
      />
      {s.cutout && (
        <path
          d={shapePath(s, weight)}
          fill="var(--primary)"
          fillOpacity=".06"
          fillRule="evenodd"
          stroke="var(--primary)"
          strokeWidth=".7"
          strokeDasharray="3 3"
        />
      )}
      {selected && (
        <g fill="var(--background)" stroke="var(--primary)" strokeWidth="1">
          <rect
            data-selection-box=""
            x={-s.width / 2 - 6}
            y={-s.height / 2 - 6}
            width={s.width + 12}
            height={s.height + 12}
            fill="none"
            strokeDasharray="4 3"
            pointerEvents="none"
          />
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((y) => (
              <Fragment key={`${x}-${y}`}>
                <rect
                  className="touch-shape-handle"
                  x={x * (s.width / 2 + 6) - 4}
                  y={y * (s.height / 2 + 6) - 4}
                  width="8"
                  height="8"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="24"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="all"
                  onPointerDown={(e) => onStart(e, s, "resize", [x, y])}
                />
                <rect
                  className="resize-handle"
                  data-handle={`${x},${y}`}
                  x={x * (s.width / 2 + 6) - 4}
                  y={y * (s.height / 2 + 6) - 4}
                  width="8"
                  height="8"
                  onPointerDown={(e) => onStart(e, s, "resize", [x, y])}
                />
              </Fragment>
            )),
          )}
          <path
            data-rotation-stem=""
            d={`M0 ${-s.height / 2 - 6}v-20`}
            pointerEvents="none"
          />
          <circle
            className="touch-shape-handle"
            cy={-s.height / 2 - 29}
            r="5"
            fill="transparent"
            stroke="transparent"
            strokeWidth="24"
            vectorEffect="non-scaling-stroke"
            pointerEvents="all"
            onPointerDown={(e) => onStart(e, s, "rotate")}
          />
          <circle
            className="rotation-handle"
            data-handle="rotation"
            cy={-s.height / 2 - 29}
            r="5"
            onPointerDown={(e) => onStart(e, s, "rotate")}
          />
        </g>
      )}
      {selected && (
        <path
          className="touch-shape-move"
          d={shapePath(s, weight)}
          fill="transparent"
          stroke="none"
          pointerEvents="fill"
        />
      )}
    </g>
  );
}

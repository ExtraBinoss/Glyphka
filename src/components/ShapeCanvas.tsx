import { useId, useRef, type PointerEvent } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  beginGestureAtom,
  designAtom,
  editAtom,
  endGestureAtom,
  guidesAtom,
  selectedShapeAtom,
} from "@/state/studio";
import { shapePath } from "@/engine/geometry";
import type { Shape } from "@/engine/model";

type Drag = {
  shape: Shape;
  px: number;
  py: number;
  action: "move" | "resize" | "rotate";
  corner?: [number, number];
};
import { SvgPaint } from "./SvgPaint";

export function ShapeCanvas({ ink }: { ink: string }) {
  const design = useAtomValue(designAtom),
    guides = useAtomValue(guidesAtom),
    [selected, setSelected] = useAtom(selectedShapeAtom);
  const edit = useSetAtom(editAtom),
    begin = useSetAtom(beginGestureAtom),
    end = useSetAtom(endGestureAtom);
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<Drag | null>(null);
  const id = useId().replaceAll(":", "");
  function point(event: PointerEvent) {
    const matrix = svg.current?.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
          matrix.inverse(),
        )
      : { x: 0, y: 0 };
  }
  function start(
    event: PointerEvent,
    shape: Shape,
    action: Drag["action"] = "move",
    corner?: [number, number],
  ) {
    if (event.button !== 0) return;
    event.stopPropagation();
    const p = point(event);
    drag.current = { shape, px: p.x, py: p.y, action, corner };
    setSelected(shape.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    begin();
  }
  function move(event: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = point(event),
      s = d.shape;
    let patch: Partial<Shape>;
    if (d.action === "rotate") {
      const startAngle = Math.atan2(d.py - s.y, d.px - s.x),
        angle = Math.atan2(p.y - s.y, p.x - s.x);
      let rotation = s.rotation + ((angle - startAngle) * 180) / Math.PI;
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      patch = { rotation: Math.round(((rotation + 540) % 360) - 180) };
    } else if (d.action === "resize") {
      const angle = (-s.rotation * Math.PI) / 180,
        dx = p.x - d.px,
        dy = p.y - d.py;
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle),
        localY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const [cx, cy] = d.corner!;
      let width = Math.max(12, Math.min(280, s.width + cx * localX * 2)),
        height = Math.max(12, Math.min(280, s.height + cy * localY * 2));
      if (event.shiftKey) {
        const scale = Math.min(width / s.width, height / s.height);
        width = Math.max(12, Math.min(280, s.width * scale));
        height = Math.max(12, Math.min(280, s.height * scale));
      }
      patch = { width: Math.round(width), height: Math.round(height) };
    } else
      patch = {
        x: Math.max(0, Math.min(600, Math.round(s.x + p.x - d.px))),
        y: Math.max(0, Math.min(440, Math.round(s.y + p.y - d.py))),
      };
    edit((prev) => ({
      ...prev,
      shapes: prev.shapes.map((shape) =>
        shape.id === s.id ? { ...shape, ...patch } : shape,
      ),
    }));
  }
  const finish = () => {
    if (drag.current) {
      drag.current = null;
      end();
    }
  };
  return (
    <svg
      ref={svg}
      className="shape-canvas"
      viewBox="0 0 600 440"
      aria-label="Composition"
      role="img"
      onPointerDown={() => setSelected(null)}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
    >
      <defs>
        <mask
          id={id}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="600"
          height="440"
        >
          <rect width="600" height="440" fill="white" />
          {design.shapes
            .filter((s) => s.cutout)
            .map((s) => (
              <path
                key={s.id}
                d={shapePath(s, design.weight)}
                transform={`translate(${s.x} ${s.y}) rotate(${s.rotation})`}
                fill="black"
                fillRule="evenodd"
              />
            ))}
        </mask>
      </defs>
      {guides && (
        <g stroke="var(--primary)" strokeWidth=".5" opacity=".25">
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d={`M${i * 40} 0V440M0 ${i * 40}H600`} />
          ))}
        </g>
      )}
      <SvgPaint width={600} height={440}>
        <g
          mask={`url(#${id})`}
          fill={ink}
          style={{ fill: "var(--glyph-paint)" }}
        >
          {design.shapes
            .filter((s) => !s.cutout)
            .map((s) => (
              <path
                key={s.id}
                d={shapePath(s, design.weight)}
                transform={`translate(${s.x} ${s.y}) rotate(${s.rotation})`}
                fillRule="evenodd"
              />
            ))}
        </g>
      </SvgPaint>
      {design.shapes.map((s) => (
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
              <rect
                key={`${x}-${y}`}
                className="resize-handle"
                data-handle={`${x},${y}`}
                x={x * (s.width / 2 + 6) - 4}
                y={y * (s.height / 2 + 6) - 4}
                width="8"
                height="8"
                onPointerDown={(e) => onStart(e, s, "resize", [x, y])}
              />
            )),
          )}
          <path d={`M0 ${-s.height / 2 - 6}v-20`} pointerEvents="none" />
          <circle
            className="rotation-handle"
            data-handle="rotation"
            cy={-s.height / 2 - 29}
            r="5"
            onPointerDown={(e) => onStart(e, s, "rotate")}
          />
        </g>
      )}
    </g>
  );
}

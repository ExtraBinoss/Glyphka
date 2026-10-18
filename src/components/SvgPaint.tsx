import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { getDefaultStore } from "jotai";
import { paintAtom, type Paint } from "@/state/studio";
import { gradientVector } from "@/engine/paint";
import { DEFAULT_DESIGN } from "@/engine/model";

const SVG_NS = "http://www.w3.org/2000/svg";
function attribute(element: Element, name: string, value: string | number) {
  const next = String(value);
  if (element.getAttribute(name) !== next) element.setAttribute(name, next);
}

export function SvgPaint({
  children,
  width,
  height,
  paint,
}: {
  children: ReactNode;
  width: number;
  height: number;
  paint?: Paint;
}) {
  const id = useId().replaceAll(":", ""),
    surface = useRef<SVGRectElement>(null),
    linear = useRef<SVGLinearGradientElement>(null),
    radial = useRef<SVGRadialGradientElement>(null);
  // React owns the deterministic first paint; subsequent paint updates keep
  // these initial props stable and are applied directly to the existing nodes.
  const [initialPaint] = useState<Paint>(() => paint ?? DEFAULT_DESIGN);
  const initialGradient = initialPaint.gradient;
  const initialVector =
    initialGradient?.type === "linear"
      ? gradientVector(initialGradient.angle, width, height)
      : undefined;
  useLayoutEffect(() => {
    const store = getDefaultStore();
    const update = () => {
      const current = paint ?? store.get(paintAtom),
        fill = current.gradient;
      const target =
        fill?.type === "radial" ? radial.current! : linear.current!;
      if (fill) {
        const other =
          fill.type === "radial" ? linear.current! : radial.current!;
        if (other.childElementCount) other.replaceChildren();
        const existing = new Map(
          [...target.children].map((node) => [
            node.getAttribute("data-stop-id"),
            node,
          ]),
        );
        fill.stops.forEach((stop, index) => {
          const node =
            existing.get(stop.id) ?? document.createElementNS(SVG_NS, "stop");
          attribute(node, "data-stop-id", stop.id);
          attribute(node, "offset", stop.position);
          attribute(node, "stop-color", stop.color);
          if (target.children[index] !== node)
            target.insertBefore(node, target.children[index] ?? null);
          existing.delete(stop.id);
        });
        for (const node of existing.values()) node.remove();
        if (fill.type === "linear")
          for (const [name, value] of Object.entries(
            gradientVector(fill.angle, width, height),
          ))
            attribute(target, name, value);
        attribute(surface.current!, "fill", `url(#${id}-${fill.type})`);
      } else {
        if (linear.current!.childElementCount)
          linear.current!.replaceChildren();
        if (radial.current!.childElementCount)
          radial.current!.replaceChildren();
        attribute(
          surface.current!,
          "fill",
          current.color === "auto" ? "var(--foreground)" : current.color,
        );
      }
    };
    update();
    // Paint is a renderer update. Paths, masks and React component instances
    // stay intact while a picker emits values at pointer frequency.
    return paint ? undefined : store.sub(paintAtom, update);
  }, [paint, width, height, id]);
  return (
    <>
      <defs>
        <linearGradient
          ref={linear}
          id={`${id}-linear`}
          gradientUnits="userSpaceOnUse"
          {...initialVector}
        >
          {initialGradient?.type === "linear" &&
            initialGradient.stops.map((stop) => (
              <stop
                key={stop.id}
                data-stop-id={stop.id}
                offset={stop.position}
                stopColor={stop.color}
              />
            ))}
        </linearGradient>
        <radialGradient ref={radial} id={`${id}-radial`} r="70.710678%">
          {initialGradient?.type === "radial" &&
            initialGradient.stops.map((stop) => (
              <stop
                key={stop.id}
                data-stop-id={stop.id}
                offset={stop.position}
                stopColor={stop.color}
              />
            ))}
        </radialGradient>
        <mask
          id={`${id}-paint`}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={width}
          height={height}
        >
          <g style={{ "--glyph-paint": "white" } as CSSProperties}>
            {children}
          </g>
        </mask>
      </defs>
      <rect
        ref={surface}
        className="paint-surface"
        width={width}
        height={height}
        fill={
          initialGradient
            ? `url(#${id}-${initialGradient.type})`
            : initialPaint.color === "auto"
              ? "var(--foreground)"
              : initialPaint.color
        }
        mask={`url(#${id}-paint)`}
      />
    </>
  );
}

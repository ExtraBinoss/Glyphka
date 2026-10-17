import { useId, type CSSProperties, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { paintAtom } from "@/state/studio";
import { gradientVector } from "@/engine/paint";

export function SvgPaint({
  children,
  width,
  height,
}: {
  children: ReactNode;
  width: number;
  height: number;
}) {
  const paint = useAtomValue(paintAtom),
    id = useId().replaceAll(":", "");
  const fill = paint.gradient;
  if (!fill)
    return (
      <g
        style={
          {
            "--glyph-paint":
              paint.color === "auto" ? "var(--foreground)" : paint.color,
          } as CSSProperties
        }
      >
        {children}
      </g>
    );
  const stops = fill.stops.map((s) => (
    <stop key={s.id} offset={s.position} stopColor={s.color} />
  ));
  return (
    <>
      <defs>
        {fill.type === "linear" ? (
          <linearGradient
            id={`${id}-gradient`}
            gradientUnits="userSpaceOnUse"
            {...gradientVector(fill.angle, width, height)}
          >
            {stops}
          </linearGradient>
        ) : (
          <radialGradient id={`${id}-gradient`} r="70.710678%">
            {stops}
          </radialGradient>
        )}
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
        width={width}
        height={height}
        fill={`url(#${id}-gradient)`}
        mask={`url(#${id}-paint)`}
      />
    </>
  );
}

import { memo, useId, useMemo, useState, type ReactNode } from "react";
import { buildDrawing, shapePath, type Mark } from "@/engine/geometry";
import type { Design, Shape } from "@/engine/model";
import type { Paint as PaintValue } from "@/state/studio";
import { SvgPaint } from "./SvgPaint";
import { AnimatePresence } from "motion/react";
import { MorphPath, MorphGroup, MorphSvg } from "./MorphSvg";

function Unpainted({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function StaticGroup({
  children,
  transform,
  className,
}: {
  children?: ReactNode;
  transform: string;
  className?: string;
}) {
  return (
    <g transform={transform} className={className}>
      {children}
    </g>
  );
}

function Marks({
  marks,
  color,
  roundness,
  painted = false,
  morph = true,
}: {
  marks: Mark[];
  color: string;
  roundness: number;
  painted?: boolean;
  morph?: boolean;
}) {
  const Path = morph ? MorphPath : "path";
  const paths = marks.map((mark, index) => (
    <Path
      key={`${index}-${mark.stroke ? "stroke" : "fill"}`}
      d={mark.d}
      transform={mark.transform}
      fill={mark.stroke ? "none" : color}
      stroke={mark.stroke ? color : undefined}
      style={
        painted
          ? {
              fill: mark.stroke ? "none" : "var(--glyph-paint)",
              stroke: mark.stroke ? "var(--glyph-paint)" : undefined,
            }
          : undefined
      }
      strokeWidth={mark.stroke}
      strokeLinecap={
        roundness > 45 ? "round" : roundness > 0 ? "square" : "butt"
      }
      strokeLinejoin={
        roundness > 45 ? "round" : roundness > 0 ? "bevel" : "miter"
      }
    />
  ));
  return morph ? (
    <AnimatePresence initial={false}>{paths}</AnimatePresence>
  ) : (
    <>{paths}</>
  );
}
export const Lettering = memo(function Lettering({
  design,
  ink = "currentColor",
  singleIndex,
  guides = false,
  onSelect,
  label = "Wordmark",
  livePaint = false,
  paint,
  morph = true,
}: {
  design: Design;
  ink?: string;
  singleIndex?: number;
  guides?: boolean;
  selected?: number;
  onSelect?: (index: number) => void;
  label?: string;
  livePaint?: boolean;
  paint?: PaintValue;
  morph?: boolean;
}) {
  const drawing = useMemo(
      () => buildDrawing(design, singleIndex),
      [design, singleIndex],
    ),
    id = useId().replaceAll(":", "");
  const Paint = livePaint || paint ? SvgPaint : Unpainted;
  const Svg = morph ? MorphSvg : "svg";
  const Group = morph ? MorphGroup : StaticGroup;
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <Svg
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      role="img"
      aria-label={label}
      className="lettering"
      style={{ overflow: "visible" }}
      onPointerLeave={() => setHovered(null)}
    >
      {guides && (
        <g
          className="construction"
          fill="none"
          stroke="currentColor"
          strokeWidth=".55"
          opacity=".45"
        >
          <path
            d={`M0 40H${drawing.width}M0 74H${drawing.width}M0 108H${drawing.width}`}
          />
          {drawing.glyphs.map((g) => (
            <g key={g.index} transform={g.transform}>
              <path d="M0 -14V115M92 -14V115" />
              <circle cx="47" cy="50" r="35" />
              <circle cx="16" cy="16" r={design.weight / 2} />
              <circle cx="77" cy="84" r={design.weight / 2} />
            </g>
          ))}
        </g>
      )}
      <Paint width={drawing.width} height={drawing.height} paint={paint}>
        {drawing.glyphs.map((glyph, i) => {
          const cuts = glyph.marks.filter((mark) => mark.cutout),
            positive = glyph.marks.filter((mark) => !mark.cutout);
          return (
            <Group
              key={glyph.index}
              transform={glyph.transform}
              className="glyph-shape"
              animate={{
                opacity: hovered === null || hovered === glyph.index ? 1 : 0.22,
              }}
              transition={{ duration: hovered === null ? 0.08 : 0.12 }}
              onClick={onSelect ? () => onSelect(glyph.index) : undefined}
            >
              {cuts.length > 0 && (
                <defs>
                  <mask
                    id={`${id}-${i}`}
                    maskUnits="userSpaceOnUse"
                    x="-50"
                    y="-50"
                    width="200"
                    height="200"
                  >
                    <rect
                      x="-50"
                      y="-50"
                      width="200"
                      height="200"
                      fill="white"
                    />
                    <Marks
                      morph={morph}
                      marks={cuts}
                      color="black"
                      roundness={design.roundness}
                    />
                  </mask>
                </defs>
              )}
              <g mask={cuts.length ? `url(#${id}-${i})` : undefined}>
                <Marks
                  morph={morph}
                  marks={positive}
                  color={ink}
                  roundness={design.roundness}
                  painted={livePaint || !!paint}
                />
              </g>
            </Group>
          );
        })}
      </Paint>
      {onSelect &&
        drawing.glyphs.map((glyph) => (
          <MorphGroup
            key={glyph.index}
            transform={glyph.transform}
            className="interactive-glyph"
            onPointerDown={(event) => {
              if (event.button === 0) event.preventDefault();
            }}
            onPointerEnter={() => setHovered(glyph.index)}
            onPointerLeave={() => setHovered(null)}
            onPointerCancel={() => setHovered(null)}
            onFocus={() => setHovered(glyph.index)}
            onBlur={() => setHovered(null)}
            tabIndex={0}
            role="button"
            aria-label={glyph.char}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(glyph.index);
              }
            }}
            onClick={() => onSelect(glyph.index)}
          >
            <>
              <rect
                className="glyph-hit"
                x="-8"
                y="-7"
                width={glyph.width / (design.width / 100) + 16}
                height="117"
                fill="transparent"
                stroke="none"
              />
            </>
          </MorphGroup>
        ))}
    </Svg>
  );
});
export function ShapeMark({
  shape,
  weight,
  color = "currentColor",
}: {
  shape: Shape;
  weight: number;
  color?: string;
}) {
  return (
    <MorphPath d={shapePath(shape, weight)} fill={color} fillRule="evenodd" />
  );
}

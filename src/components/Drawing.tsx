import { memo, useId } from "react";
import { buildDrawing, shapePath, type Mark } from "@/engine/geometry";
import type { Design, Shape } from "@/engine/model";

function Marks({
  marks,
  color,
  roundness,
}: {
  marks: Mark[];
  color: string;
  roundness: number;
}) {
  return marks.map((mark, index) => (
    <path
      key={index}
      d={mark.d}
      transform={mark.transform}
      fill={mark.stroke ? "none" : color}
      stroke={mark.stroke ? color : undefined}
      strokeWidth={mark.stroke}
      strokeLinecap={
        roundness > 45 ? "round" : roundness > 0 ? "square" : "butt"
      }
      strokeLinejoin={
        roundness > 45 ? "round" : roundness > 0 ? "bevel" : "miter"
      }
    />
  ));
}
export const Lettering = memo(function Lettering({
  design,
  ink = "currentColor",
  singleIndex,
  guides = false,
  selected,
  onSelect,
  label = "Wordmark",
}: {
  design: Design;
  ink?: string;
  singleIndex?: number;
  guides?: boolean;
  selected?: number;
  onSelect?: (index: number) => void;
  label?: string;
}) {
  const drawing = buildDrawing(design, singleIndex),
    id = useId().replaceAll(":", "");
  return (
    <svg
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      role="img"
      aria-label={label}
      className="lettering"
      style={{ overflow: "visible" }}
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
      {drawing.glyphs.map((glyph, i) => {
        const cuts = glyph.marks.filter((mark) => mark.cutout),
          positive = glyph.marks.filter((mark) => !mark.cutout);
        return (
          <g
            key={glyph.index}
            transform={glyph.transform}
            className={onSelect ? "interactive-glyph" : undefined}
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
                  <rect x="-50" y="-50" width="200" height="200" fill="white" />
                  <Marks
                    marks={cuts}
                    color="black"
                    roundness={design.roundness}
                  />
                </mask>
              </defs>
            )}
            <g mask={cuts.length ? `url(#${id}-${i})` : undefined}>
              <Marks
                marks={positive}
                color={ink}
                roundness={design.roundness}
              />
            </g>
            {onSelect && (
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
                <path
                  className={`glyph-underline ${selected === glyph.index ? "selected" : ""}`}
                  d={`M0 116H${glyph.width / (design.width / 100)}`}
                  strokeWidth="1.5"
                  stroke="var(--primary)"
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
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
  return <path d={shapePath(shape, weight)} fill={color} fillRule="evenodd" />;
}

import { useId } from "react";
import { INTRO_LETTERS } from "@/lib/brand-glyphs";

/** The intro and the permanent logo share the exact same vector geometry. */
export function BrandWord({ animated = false }: { animated?: boolean }) {
  const id = useId().replaceAll(":", "");
  return (
    <span
      className={`brand-word ${animated ? "startup-word" : "brand-finished"}`}
      aria-hidden="true"
    >
      {INTRO_LETTERS.map(
        ({ char, family, variant, frames, positiveCount, cutoutCount }) => {
          const frame = frames[animated ? 0 : frames.length - 1];
          const slots = (cutout: boolean, count: number) => {
            const marks = frame.marks.filter(
              (mark) => !!mark.cutout === cutout,
            );
            return Array.from({ length: count }, (_, index) => {
              const mark = marks[index];
              return (
                <path
                  key={`${char}-${cutout}-${index}`}
                  data-intro-cut={cutout ? "" : undefined}
                  data-intro-ink={!cutout ? "" : undefined}
                  d={mark?.d ?? ""}
                  transform={mark?.transform}
                  opacity={mark ? 1 : 0}
                  fill={
                    mark?.stroke ? "none" : cutout ? "black" : "currentColor"
                  }
                  stroke={
                    mark?.stroke ? (cutout ? "black" : "currentColor") : "none"
                  }
                  strokeWidth={mark?.stroke ?? 0}
                  strokeLinecap={frame.roundness > 45 ? "round" : "butt"}
                  strokeLinejoin={frame.roundness > 45 ? "round" : "miter"}
                />
              );
            });
          };
          return (
            <span
              className={`brand-letter ${animated ? "startup-letter" : ""}`}
              data-letter={char}
              data-language={family}
              data-variant={variant}
              key={char}
            >
              <svg viewBox="-20 -22 132 145" focusable="false">
                <defs>
                  <mask
                    id={`${id}-${char}`}
                    x="-40"
                    y="-40"
                    width="180"
                    height="180"
                    maskUnits="userSpaceOnUse"
                  >
                    <rect
                      x="-40"
                      y="-40"
                      width="180"
                      height="180"
                      fill="white"
                    />
                    {slots(true, cutoutCount)}
                  </mask>
                  <g id={`${id}-${char}-face`} mask={`url(#${id}-${char})`}>
                    {slots(false, positiveCount)}
                  </g>
                </defs>
                <use
                  className="brand-depth"
                  href={`#${id}-${char}-face`}
                  transform="translate(3 4)"
                />
                <use
                  className="brand-depth"
                  href={`#${id}-${char}-face`}
                  transform="translate(1.5 2)"
                />
                <use href={`#${id}-${char}-face`} />
              </svg>
            </span>
          );
        },
      )}
    </span>
  );
}

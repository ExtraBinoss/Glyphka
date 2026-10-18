import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SvgPaint } from "./SvgPaint";
import { DEFAULT_DESIGN } from "@/engine/model";
import { DEFAULT_GRADIENT } from "@/engine/paint";
import type { Paint } from "@/state/studio";

function markup(paint?: Paint) {
  return renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(SvgPaint, {
        paint,
        width: 160,
        height: 100,
        children: createElement("path", { d: "M0 0H80V80H0Z" }),
      }),
    ),
  );
}

it("renders solid and theme-aware paints before client layout effects", () => {
  expect(markup()).toContain(
    `fill="${DEFAULT_DESIGN.color === "auto" ? "var(--foreground)" : DEFAULT_DESIGN.color}"`,
  );
  expect(markup({ color: "auto" })).toContain('fill="var(--foreground)"');
  expect(markup({ color: "#ff5a1f" })).toContain('fill="#ff5a1f"');
});

it("renders initial gradient stops and coordinates for both fill types", () => {
  for (const type of ["linear", "radial"] as const) {
    const svg = markup({
      color: "#2563eb",
      gradient: { ...DEFAULT_GRADIENT, type },
    });
    expect(svg).toContain(`-${type})`);
    expect(svg).toContain('data-stop-id="start"');
    expect(svg).toContain('stop-color="#2563eb"');
    expect(svg).toContain('stop-color="#a855f7"');
    expect(svg).toContain('mask="url(#');
    if (type === "linear") expect(svg).toMatch(/ x1="[\d.-]+"/);
  }
});

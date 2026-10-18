import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { DEFAULT_DESIGN } from "../src/engine/model";
import { generateShapeCandidates } from "../src/engine/generate";

const design = structuredClone(DEFAULT_DESIGN);
design.shapes = Array.from({ length: 120 }, (_, index) => ({
  ...generateShapeCandidates(index)[0],
  id: `stress-${index}`,
  x: 25 + (index % 12) * 48,
  y: 25 + Math.floor(index / 12) * 40,
  width: 32,
  height: 32,
}));
design.shapes[119] = {
  ...generateShapeCandidates(17)[0],
  id: "active",
  x: 300,
  y: 220,
  width: 160,
  height: 120,
};
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: "fr-FR",
    reducedMotion: "reduce",
  });
  await page.addInitScript(
    (design) =>
      localStorage.setItem("glyphka.design.v1", JSON.stringify(design)),
    design,
  );
  await page.goto(
    process.env.GLYPHKA_PERF_URL ?? "http://127.0.0.1:8403/?profile",
  );
  await page.getByRole("button", { name: "Formes", exact: true }).click();
  await page.locator(".layer").first().click();
  const shape = page.locator('[data-shape-id="part-119"]');
  await shape.waitFor();
  const probe = await page.evaluateHandle(() => {
    const svg = document.querySelector(".shape-canvas")!;
    const latencies: number[] = [];
    let timestamp = 0,
      foreignMutations = 0,
      writes = 0;
    const move = () => {
      timestamp = performance.now();
    };
    svg.addEventListener("pointermove", move, true);
    const observer = new MutationObserver((records) => {
      if (timestamp) {
        latencies.push(performance.now() - timestamp);
        timestamp = 0;
      }
      foreignMutations += records.filter((record) => {
        const element = record.target as Element;
        return (
          element.matches("[data-shape-paint]") &&
          element.getAttribute("data-shape-paint") !== "part-119"
        );
      }).length;
    });
    observer.observe(svg, {
      subtree: true,
      attributes: true,
      attributeFilter: ["d", "transform"],
    });
    const descriptor = Object.getOwnPropertyDescriptor(
      Storage.prototype,
      "setItem",
    )!;
    const originalSet = descriptor.value as Storage["setItem"];
    Storage.prototype.setItem = function (...args) {
      writes++;
      return originalSet.apply(this, args);
    };
    performance.clearMeasures();
    return {
      latencies,
      get foreignMutations() {
        return foreignMutations;
      },
      get writes() {
        return writes;
      },
      dispose() {
        observer.disconnect();
        svg.removeEventListener("pointermove", move, true);
        Object.defineProperty(Storage.prototype, "setItem", descriptor);
      },
    };
  });
  const gestures = [];
  page.setDefaultTimeout(15000);
  for (const action of ["move", "resize", "rotate"] as const) {
    console.log(`Measuring ${action}`);
    const target =
      action === "move"
        ? shape.locator("path").first()
        : shape.locator(
            action === "resize"
              ? '[data-handle="1,1"]'
              : '[data-handle="rotation"]',
          );
    const box = (await target.boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await probe.evaluate((probe) => {
      probe.latencies.length = 0;
    });
    await page.mouse.move(x, y);
    await page.mouse.down();
    const started = Date.now();
    await page.mouse.move(
      x + (action === "resize" ? 35 : 100),
      y + (action === "rotate" ? 60 : 35),
      { steps: 90 },
    );
    const beforeRelease = await page
      .getByRole("textbox", {
        name:
          action === "move"
            ? "X · value"
            : action === "resize"
              ? "Largeur · value"
              : "Rotation · value",
        exact: true,
      })
      .inputValue();
    await page.mouse.up();
    const latencies = await probe.evaluate((probe) => probe.latencies);
    const sorted = [...latencies].sort((a, b) => a - b);
    gestures.push({
      action,
      shapeCount: 120,
      samples: sorted.length,
      durationMs: Date.now() - started,
      inputToSvgP50: sorted[Math.floor(sorted.length * 0.5)],
      inputToSvgP95: sorted[Math.floor(sorted.length * 0.95)],
      valueBeforeRelease: beforeRelease,
    });
  }
  const hotPath = await page.evaluate(() =>
    performance
      .getEntriesByName("glyphka:shapes:gesture")
      .map((entry) => entry.duration),
  );
  const counters = await probe.evaluate((probe) => ({
    unrelatedShapeMutations: probe.foreignMutations,
    storageWrites: probe.writes,
  }));
  await probe.evaluate((probe) => probe.dispose());
  const report = {
    environment:
      "Local Chromium, 1440x1000, 120 procedural shapes; input-to-SVG DOM latency, not screen presentation",
    gestures,
    counters,
    hotPathP95: [...hotPath].sort((a, b) => a - b)[
      Math.floor(hotPath.length * 0.95)
    ],
  };
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    process.env.GLYPHKA_SHAPES_REPORT ??
      "artifacts/shapes-performance-latest.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

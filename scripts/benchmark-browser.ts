import { chromium, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { cpus } from "node:os";

const url = process.env.GLYPHKA_PERF_URL ?? "http://127.0.0.1:8403/?profile";
const output =
  process.env.GLYPHKA_PERF_REPORT ?? "artifacts/browser-performance.json";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  locale: "fr-FR",
  reducedMotion: "no-preference",
});
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => {
  const state = {
    active: false,
    pending: 0,
    latencies: [] as number[],
    frames: [] as number[],
    longTasks: [] as number[],
    previous: 0,
  };
  (window as unknown as Record<string, unknown>).__glyphkaPerf = state;
  new PerformanceObserver((entries) => {
    if (state.active)
      state.longTasks.push(...entries.getEntries().map((e) => e.duration));
  }).observe({ type: "longtask", buffered: true });
  const activation = { start: 0, frame: 0 };
  (window as unknown as Record<string, unknown>).__glyphkaActivation =
    activation;
  document.addEventListener(
    "click",
    (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('button[aria-label="3D"]')
      ) {
        activation.start = performance.now();
        activation.frame = 0;
      }
    },
    true,
  );
  new MutationObserver((records) => {
    if (
      activation.start &&
      !activation.frame &&
      records.some(
        (r) =>
          r.attributeName === "data-frames" &&
          r.target instanceof HTMLElement &&
          Number(r.target.dataset.revision) > 0,
      )
    )
      activation.frame = performance.now();
  }).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-frames"],
  });
  const frame = (now: number) => {
    if (state.active && state.previous) state.frames.push(now - state.previous);
    state.previous = now;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  for (const name of [
    "pointerdown",
    "pointermove",
    "pointerover",
    "keydown",
    "click",
  ])
    document.addEventListener(
      name,
      () => {
        if (state.active) state.pending = performance.now();
      },
      { capture: true, passive: true },
    );
  new MutationObserver((records) => {
    if (!state.active || !state.pending) return;
    if (
      records.some(
        (r) =>
          r.target instanceof Element &&
          r.target.closest(".canvas-area") &&
          [
            "d",
            "stroke-width",
            "viewBox",
            "style",
            "data-paint",
            "fill",
            "stop-color",
            "offset",
            "x1",
            "x2",
            "y1",
            "y2",
            "data-revision",
          ].includes(r.attributeName ?? ""),
      )
    ) {
      state.latencies.push(performance.now() - state.pending);
      state.pending = 0;
    }
  }).observe(document, { subtree: true, attributes: true });
});
type Stats = {
  samples: number;
  medianMs: number | null;
  p95Ms: number | null;
  maxMs: number | null;
};
function stats(values: number[]): Stats {
  if (!values.length)
    return { samples: 0, medianMs: null, p95Ms: null, maxMs: null };
  values.sort((a, b) => a - b);
  const n = values.length,
    round = (v: number) => Math.round((v || 0) * 100) / 100;
  return {
    samples: n,
    medianMs: round(values[Math.floor(n / 2)]),
    p95Ms: round(values[Math.min(n - 1, Math.floor(n * 0.95))]),
    maxMs: round(values.at(-1)!),
  };
}
const rows: {
  scenario: string;
  inputToDom: Stats;
  frameIntervals: Stats;
  longTasks: number[];
  cpu: Record<string, Stats>;
  elapsedMs: number;
}[] = [];
async function scenario(name: string, run: () => Promise<unknown>) {
  await page.evaluate(() => {
    for (const e of performance.getEntriesByType("measure"))
      if (e.name.startsWith("glyphka:")) performance.clearMeasures(e.name);
  });
  await page.evaluate(() =>
    Object.assign((window as unknown as Record<string, object>).__glyphkaPerf, {
      active: true,
      pending: 0,
      latencies: [],
      frames: [],
      longTasks: [],
      previous: 0,
    }),
  );
  const start = performance.now();
  await run();
  await page.waitForTimeout(350);
  const result = await page.evaluate(() => {
    const state = (
      window as unknown as Record<
        string,
        {
          active: boolean;
          latencies: number[];
          frames: number[];
          longTasks: number[];
        }
      >
    ).__glyphkaPerf;
    state.active = false;
    return {
      ...state,
      measures: performance
        .getEntriesByType("measure")
        .filter((e) => e.name.startsWith("glyphka:"))
        .map((e) => ({ name: e.name, ms: e.duration })),
    };
  });
  const measures: Record<string, number[]> = {};
  for (const m of result.measures) (measures[m.name] ??= []).push(m.ms);
  rows.push({
    scenario: name,
    inputToDom: stats(result.latencies),
    frameIntervals: stats(result.frames),
    longTasks: result.longTasks.map((v) => Math.round(v)),
    cpu: Object.fromEntries(
      Object.entries(measures).map(([name, values]) => [name, stats(values)]),
    ),
    elapsedMs: Math.round(performance.now() - start),
  });
  console.log(name, JSON.stringify(rows.at(-1)));
}
async function drag(selector: string) {
  const control = page.locator(selector).first();
  await control.scrollIntoViewIfNeeded();
  const box = await control.boundingBox();
  if (!box) throw new Error(`Missing control: ${selector}`);
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 32; i++)
    await page.mouse.move(
      box.x + box.width * (0.15 + (i / 31) * 0.7),
      box.y + box.height / 2,
    );
  await page.mouse.up();
}
async function openGradient(p: Page) {
  await p
    .getByRole("button", { name: "Couleur personnalisée", exact: true })
    .click();
  await p.getByRole("button", { name: "Remplissage", exact: true }).click();
  await p.getByRole("menuitemradio", { name: "Dégradé", exact: true }).click();
  await p
    .locator('.gradient-editor [data-slot="color-picker-area"]')
    .waitFor({ state: "visible" });
}
try {
  await page.goto(url);
  await page.getByRole("img", { name: "PLINKA", exact: true }).waitFor();
  await page.waitForTimeout(1500);
  const startup = await page.evaluate(() => ({
    paint: performance
      .getEntriesByType("paint")
      .map((p) => ({ name: p.name, ms: Math.round(p.startTime) })),
    resources: performance
      .getEntriesByType("resource")
      .reduce((n, r) => n + (r as PerformanceResourceTiming).transferSize, 0),
    elements: document.querySelectorAll("*").length,
  }));
  await scenario("2D thickness drag", () => drag('[data-slot="slider-track"]'));
  await scenario("Navigation and tooltips hover", async () => {
    for (let i = 0; i < 4; i++) {
      await page.locator(".rail").hover();
      await page.waitForTimeout(300);
      await page.locator(".word-logo").hover();
    }
    await page.getByRole("button", { name: "Zoom avant", exact: true }).hover();
    await page.waitForTimeout(500);
  });
  await scenario("2D letter hover", async () => {
    for (let i = 0; i < 18; i++)
      await page
        .locator("main .glyph-hit")
        .nth(i % 6)
        .hover();
  });
  await scenario("Discrete family morphs", async () => {
    for (const name of ["Circuit", "Ruban", "Flux", "Halo"]) {
      await page
        .locator(".family")
        .filter({ hasText: new RegExp(`^${name}$`) })
        .click();
      await page.waitForTimeout(320);
    }
  });
  await page
    .getByRole("button", { name: "D’autres directions", exact: false })
    .click();
  await scenario("2D direction hover", async () => {
    for (let i = 0; i < 16; i++)
      await page
        .locator(".variation-card")
        .nth(i % 4)
        .hover();
  });
  await page.locator(".word-logo").hover();
  await page
    .getByRole("button", { name: "Couleur personnalisée", exact: true })
    .click();
  await scenario("2D solid color drag", () =>
    drag('[data-slot="color-picker-area"]'),
  );
  await page.keyboard.press("Escape");
  await openGradient(page);
  await scenario("2D gradient color drag", () =>
    drag('.gradient-editor [data-slot="color-picker-area"]'),
  );
  await page.keyboard.press("Escape");
  const cold = performance.now();
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.getByTestId("three-scene").locator("canvas").waitFor();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="three-scene"]')
        ?.getAttribute("data-ready") === "true",
    null,
    { timeout: 60000 },
  );
  await page.waitForFunction(
    () =>
      (window as unknown as Record<string, { frame: number }>)
        .__glyphkaActivation.frame > 0,
    null,
    { timeout: 60000 },
  );
  const cold3dMs = Math.round(performance.now() - cold);
  const coldClickToFrameMs = await page.evaluate(() => {
    const a = (
      window as unknown as Record<string, { start: number; frame: number }>
    ).__glyphkaActivation;
    return Math.round(a.frame - a.start);
  });
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).__originalCanvas =
      document.querySelector(".three-host canvas");
  });
  await scenario("3D direction hover", async () => {
    for (let i = 0; i < 16; i++) {
      await page
        .locator(".variation-card")
        .nth(i % 4)
        .hover();
      await page.waitForTimeout(100);
    }
  });
  await page.locator(".word-logo").hover();
  await page.waitForFunction(
    () => !document.querySelector(".three-host")?.hasAttribute("data-pending"),
  );
  await page
    .getByRole("button", { name: "Modifier le dégradé", exact: true })
    .click();
  const scene = page.getByTestId("three-scene"),
    revision = await scene.getAttribute("data-revision");
  await scenario("3D gradient color drag", () =>
    drag('.gradient-editor [data-slot="color-picker-area"]'),
  );
  const paintRebuiltGeometry =
    revision !== (await scene.getAttribute("data-revision"));
  await page.keyboard.press("Escape");
  await scenario("3D extrusion drag", () =>
    drag(
      '[data-slot="slider"]:has([role="slider"][aria-label="Extrusion"]) [data-slot="slider-track"]',
    ),
  );
  await page.waitForFunction(
    () => !document.querySelector(".three-host")?.hasAttribute("data-pending"),
  );
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.waitForTimeout(400);
  const warm = performance.now();
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const warm3dMs = Math.round(performance.now() - warm);
  await page.waitForFunction(
    () =>
      (window as unknown as Record<string, { frame: number }>)
        .__glyphkaActivation.frame > 0,
  );
  const warmClickToFrameMs = await page.evaluate(() => {
    const a = (
      window as unknown as Record<string, { start: number; frame: number }>
    ).__glyphkaActivation;
    return Math.round(a.frame - a.start);
  });
  const sameCanvas = await page.evaluate(
    () =>
      (window as unknown as Record<string, unknown>).__originalCanvas ===
      document.querySelector(".three-host canvas"),
  );
  const report = {
    revision: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    dirty: !!execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
    }).trim(),
    measuredAt: new Date().toISOString(),
    browser: browser.version(),
    viewport: "1440×1000",
    gpu: "SwiftShader software GPU",
    cpu: cpus()[0]?.model,
    note: "Local production build. Input-to-DOM measures event handling through the relevant SVG/material mutation, not photon latency. Frame intervals cover the whole scenario including automation waits. Hardware contention affects timings.",
    startup,
    cold3dMs,
    coldClickToFrameMs,
    warm3dMs,
    warmClickToFrameMs,
    sameCanvas,
    paintRebuiltGeometry,
    rows,
    errors,
  };
  await mkdir("artifacts", { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

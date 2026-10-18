import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  locale: "fr-FR",
  reducedMotion: "no-preference",
});
const cpu = Number(process.env.GLYPHKA_HOVER_CPU ?? 4);
const count = Number(process.env.GLYPHKA_HOVER_COUNT ?? 48);
const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
await page.addInitScript(() => {
  let seed = 4250;
  Math.random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
});
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
const rows: unknown[] = [];
const warmup: { label: string | null; geometryBytes: number }[] = [];
function stats(values: number[]) {
  values.sort((a, b) => a - b);
  const rounded = (value: number | undefined) =>
    value === undefined ? null : Math.round(value * 100) / 100;
  return {
    samples: values.length,
    medianMs: rounded(values[Math.floor(values.length * 0.5)]),
    p95Ms: rounded(values[Math.floor(values.length * 0.95)]),
    maxMs: rounded(values.at(-1)),
  };
}
async function measure(name: string, run: () => Promise<void>) {
  const monitor = await page.evaluateHandle(() => {
    const latencies: number[] = [],
      frames: number[] = [],
      longTasks: number[] = [];
    let pending = 0,
      previous = 0,
      frame = 0;
    const input = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".variation-card, .family")
      )
        pending = performance.now();
    };
    document.addEventListener("pointerover", input, true);
    document.addEventListener("click", input, true);
    const observer = new MutationObserver((records) => {
      if (
        pending &&
        records.some(
          (record) =>
            record.target instanceof Element &&
            ((record.target.closest(".drawing-area") &&
              (record.type === "childList" ||
                ["d", "stroke-width", "viewBox"].includes(
                  record.attributeName ?? "",
                ))) ||
              record.attributeName === "data-revision"),
        )
      ) {
        latencies.push(performance.now() - pending);
        pending = 0;
      }
    });
    observer.observe(document, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ["d", "stroke-width", "viewBox", "data-revision"],
    });
    const tasks = new PerformanceObserver((list) =>
      longTasks.push(...list.getEntries().map((entry) => entry.duration)),
    );
    tasks.observe({ type: "longtask" });
    const tick = (now: number) => {
      if (previous) frames.push(now - previous);
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    performance.clearMeasures();
    return {
      finish() {
        observer.disconnect();
        tasks.disconnect();
        cancelAnimationFrame(frame);
        document.removeEventListener("pointerover", input, true);
        document.removeEventListener("click", input, true);
        return {
          latencies,
          frames,
          longTasks,
          measures: performance
            .getEntriesByType("measure")
            .filter((entry) => entry.name.startsWith("glyphka:"))
            .map((entry) => ({ name: entry.name, ms: entry.duration })),
        };
      },
    };
  });
  await run();
  await page.waitForTimeout(400);
  const result = await monitor.evaluate((monitor) => monitor.finish());
  await monitor.dispose();
  const measures: Record<string, number[]> = {};
  for (const measure of result.measures)
    (measures[measure.name] ??= []).push(measure.ms);
  const row = {
    name,
    inputToGeometry: stats(result.latencies),
    frameIntervals: stats(result.frames),
    longTasks: result.longTasks.map(Math.round),
    cpu: Object.fromEntries(
      Object.entries(measures).map(([key, values]) => [key, stats(values)]),
    ),
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}
const trigger = page.locator(".variation-heading > button").first();
async function sweep(count: number) {
  const cards = await page.locator(".variation-card").all();
  const boxes = await Promise.all(cards.map((card) => card.boundingBox()));
  for (let i = 0; i < count; i++) {
    const box = boxes[i % 4]!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  }
}
try {
  await page.goto(
    process.env.GLYPHKA_HOVER_URL ?? "http://127.0.0.1:8403/?profile",
  );
  await page.locator(".word-logo").waitFor();
  await page.waitForTimeout(1500);
  await measure("2D tray open and rapid hover", async () => {
    await trigger.hover();
    await sweep(count);
  });
  await measure("2D warm rapid hover", () => sweep(count));
  await page.locator(".word-logo").hover();
  await measure("Interrupted family morphs", async () => {
    for (let i = 0; i < 12; i++) {
      const family = page.locator(".family").nth(i % 8);
      await family.click();
    }
  });
  await page.getByRole("button", { name: "3D", exact: true }).click();
  const scene = page.getByTestId("three-scene");
  await scene.locator("canvas").waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector(".three-host")?.getAttribute("data-ready") ===
      "true",
    null,
    { timeout: 60000 },
  );
  await trigger.hover();
  // Warm the four independent GPU buffers before measuring repeated swaps.
  for (const card of await page.locator(".variation-card").all()) {
    const revision = await scene.getAttribute("data-revision");
    await card.hover();
    await page.waitForFunction(
      (previous) =>
        document.querySelector(".three-host")?.getAttribute("data-revision") !==
        previous,
      revision,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () =>
        !document.querySelector(".three-host")?.hasAttribute("data-pending"),
      null,
      { timeout: 60000 },
    );
    warmup.push({
      label: await card.getAttribute("aria-label"),
      geometryBytes: Number(await scene.getAttribute("data-vertices")) * 32,
    });
  }
  console.log("3D warmup", JSON.stringify(warmup));
  await measure("3D warm rapid hover", () => sweep(count));
  await page.locator(".word-logo").hover();
  await page.waitForFunction(
    () => !document.querySelector(".three-host")?.hasAttribute("data-pending"),
  );
  if (errors.length) throw new Error(errors.join("\n"));
  const output =
    process.env.GLYPHKA_HOVER_REPORT ?? "artifacts/hover-performance.json";
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    output,
    JSON.stringify(
      {
        cpuSlowdown: cpu,
        gpu: "SwiftShader software renderer",
        browser: browser.version(),
        rows,
        warmup,
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

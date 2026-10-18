import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Record the real studio: its letter-by-letter introduction, then three rolls.
// Build and start `bun run preview --port 8403` before running this script.
const output = resolve("artifacts/demo");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: "en-US",
    colorScheme: "light",
    reducedMotion: "no-preference",
    recordVideo: { dir: output, size: { width: 1280, height: 720 } },
  });
  await context.addInitScript(() => {
    localStorage.setItem("glyphka.theme", "light");
    localStorage.setItem("glyphka.language", "en");
    let seed = 4250;
    Math.random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };
  });
  const page = await context.newPage();
  const recording = page.video()!;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.GLYPHKA_CAPTURE_URL ?? "http://127.0.0.1:8403/", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => document.documentElement.dataset.glyphkaIntro === "playing",
  );
  const navigation = await page.evaluate(() => performance.now());
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-glyphka-intro"),
  );
  await page.waitForTimeout(850);
  const die = page.getByRole("button", { name: "Randomize", exact: true });
  const seeds = [13, 71, 348];
  for (let index = 1; index <= 3; index++) {
    // Reproducible examples still go through the app's real randomization action.
    await page.evaluate(
      (seed) => {
        Math.random = () => (seed + 0.5) / 999999;
      },
      seeds[index - 1],
    );
    await die.click();
    await page.mouse.move(900, 78);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: resolve(output, `roll-${index}.png`) });
  }
  await page.waitForTimeout(650);
  await context.close();
  await recording.saveAs(resolve(output, "glyphka-source.webm"));
  await writeFile(
    resolve(output, "capture.json"),
    JSON.stringify(
      {
        viewport: "1280x720",
        introObservedMs: navigation,
        rolls: 3,
        seeds,
        errors,
      },
      null,
      2,
    ),
  );
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "Recorded the introduction and three random designs in artifacts/demo/.",
  );
} finally {
  await browser.close();
}

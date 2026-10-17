import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage();
  await page.goto("about:blank");
  await page.addScriptTag({ path: "artifacts/bake-environment.js" });
  const data = await page.evaluate(
    () =>
      (
        window as unknown as Record<
          string,
          { width: number; height: number; pixels: number[] }
        >
      ).__bakedEnvironment,
  );
  if (
    data.width !== 336 ||
    data.height !== 256 ||
    !data.pixels.some((v) => v > 0)
  )
    throw new Error("Invalid environment bake");
  await mkdir("src/assets", { recursive: true });
  await writeFile(
    "src/assets/studio-environment.bin",
    gzipSync(new Uint8Array(new Uint16Array(data.pixels).buffer), { level: 9 }),
  );
  console.log(
    `Baked ${data.width}×${data.height} RGBA16F environment (${data.pixels.length * 2} bytes).`,
  );
} finally {
  await browser.close();
}

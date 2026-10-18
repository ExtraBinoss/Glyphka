import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { serializeSvg } from "../src/engine/geometry";
import { DEFAULT_DESIGN, PRESETS } from "../src/engine/model";
import { BRAND_DESIGN } from "../src/lib/brand-design";

await mkdir("artwork/social/assets", { recursive: true });
await mkdir("public/brand", { recursive: true });
await mkdir("public/social", { recursive: true });

const wordmark = (ink: string) =>
  serializeSvg(BRAND_DESIGN, "wordmark", ink).replace(
    "<title>GLYPHKA</title>",
    "<title>Glyphka</title>",
  );
await writeFile("public/brand/glyphka-wordmark.svg", wordmark("#17213c"));
await writeFile("public/brand/glyphka-wordmark-white.svg", wordmark("#ffffff"));
await writeFile("public/brand/glyphka-lettering.svg", wordmark("#2563eb"));
await writeFile("artwork/social/assets/wordmark.svg", wordmark("#17213c"));

const playground = [
  ["a", "A", "signal", "#2563eb"],
  ["r", "R", "ribbon", "#17213c"],
  ["o", "O", "orbital", "#8b5cf6"],
  ["p", "P", "stencil", "#17213c"],
  ["k", "K", "modular", "#2563eb"],
  ["s", "S", "soft", "#27bca0"],
  ["t", "T", "circuit", "#8b5cf6"],
  ["x", "X", "fracture", "#2563eb"],
  ["b", "B", "duplex", "#17213c"],
] as const;
for (const [name, text, family, color] of playground)
  await writeFile(
    `artwork/social/assets/play-${name}.svg`,
    serializeSvg(
      {
        ...DEFAULT_DESIGN,
        ...PRESETS[family],
        text,
        mutation: 0,
        seed: 17,
        gradient: null,
      },
      "symbol",
      color,
    ),
  );
await copyFile(
  "node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  "artwork/social/assets/heading.woff2",
);
await copyFile(
  "node_modules/@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2",
  "artwork/social/assets/body.woff2",
);
const favicon = serializeSvg(
  { ...BRAND_DESIGN, text: "G" },
  "symbol",
  "#2563eb",
);
await writeFile("public/favicon.svg", favicon);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await page.goto(pathToFileURL(resolve("artwork/social/index.html")).href);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  await page.screenshot({ path: "public/social/glyphka.png" });
  console.log(
    "Rendered artwork/social/index.html → public/social/glyphka.png (1200 × 630).",
  );
} finally {
  await browser.close();
}

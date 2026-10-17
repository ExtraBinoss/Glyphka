import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("keeps the canvas quiet, reveals variations and opens a clicked letter as a symbol", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".studio-title, .canvas-meta")).toHaveCount(0);
  await expect(page.locator(".variation-card")).toHaveCount(0);
  const reveal = page.getByRole("button", {
    name: "D’autres directions",
    exact: false,
  });
  await reveal.click();
  await expect(page.locator(".variation-card")).toHaveCount(4);
  await reveal.click();
  await expect(page.locator(".variation-card")).toHaveCount(0);
  await page.locator("main .glyph-hit").nth(1).click();
  await expect(page.locator(".drawing-area[data-mode=symbol]")).toBeVisible();
  await expect(page.locator("main .glyph-hit")).toHaveCount(1);
  await page.getByRole("button", { name: "Formes", exact: true }).click();
  await expect(
    page.locator(".drawing-area[data-mode=shapes] .shape-canvas"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lettrage", exact: true }).click();
  await expect(page.locator(".drawing-area[data-mode=wordmark]")).toBeVisible();
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
});

test("edits and persists gradient stops, and exports a genuinely colored transparent SVG", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dégradé", exact: true }).click();
  await page
    .getByRole("button", { name: "Modifier le dégradé", exact: true })
    .click();
  const bar = page.locator('[data-slot="gradient-bar"]');
  await page
    .getByRole("button", { name: "Ajouter un stop", exact: true })
    .click();
  await expect(bar.getByRole("slider")).toHaveCount(3);
  const middle = bar.getByRole("slider").nth(1);
  const before = await middle.getAttribute("aria-valuenow");
  const bounds = await middle.boundingBox();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2 + 30,
    bounds!.y + bounds!.height / 2,
    { steps: 5 },
  );
  expect(await middle.getAttribute("aria-valuenow")).not.toBe(before);
  await expect(page.locator("main linearGradient stop")).toHaveCount(3);
  await page.mouse.up();
  await page.keyboard.press("Escape");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "SVG", exact: true }).click(),
  ]);
  const source = await readFile((await download.path())!, "utf8");
  const pixels = await page.evaluate(async (svg) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();
    let clear = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 255)
        colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      if (data[i + 3] === 0) clear++;
    }
    URL.revokeObjectURL(url);
    return { colors: colors.size, clear };
  }, source);
  expect(pixels.colors).toBeGreaterThan(100);
  expect(pixels.clear).toBeGreaterThan(10000);
  await page.reload();
  await expect(page.locator("main linearGradient stop")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Modifier le dégradé", exact: true })
    .click();
  await page.getByRole("button", { name: "Radial", exact: true }).click();
  await expect(page.locator("main radialGradient stop")).toHaveCount(3);
});

test("applies live solid and gradient paint to 3D without extruding again", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("button", { name: "Rendu 3D", exact: true }).click();
  const scene = page.getByTestId("three-scene");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  const revision = await scene.getAttribute("data-revision");
  await page
    .getByRole("button", { name: "Couleur personnalisée", exact: true })
    .click();
  const area = page.locator('[data-slot="color-picker-area"]');
  const bounds = await area.boundingBox();
  await page.mouse.move(
    bounds!.x + bounds!.width * 0.4,
    bounds!.y + bounds!.height * 0.3,
  );
  await page.mouse.down();
  const before = await scene.getAttribute("data-paint");
  await page.mouse.move(
    bounds!.x + bounds!.width * 0.8,
    bounds!.y + bounds!.height * 0.65,
    { steps: 5 },
  );
  await expect(scene).not.toHaveAttribute("data-paint", before!);
  await expect(scene).toHaveAttribute("data-revision", revision!);
  await page.mouse.up();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Dégradé", exact: true }).click();
  await expect(scene).toHaveAttribute("data-paint", /stops/);
  await page
    .getByRole("button", { name: "Modifier le dégradé", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ajouter un stop", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-paint", /s\d+/);
  await expect(scene).toHaveAttribute("data-revision", revision!);
  await page.keyboard.press("Escape");
  await scene.evaluate((el) => el.setAttribute("data-instance", "preserved"));
  await page.getByRole("button", { name: "Symbole", exact: true }).click();
  await expect(scene).toHaveAttribute("data-instance", "preserved");
});

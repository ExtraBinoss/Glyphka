import { expect, test } from "@playwright/test";

test("previews a direction without saving or adding history, then commits it on click", async ({
  page,
}) => {
  await page.goto("/");
  const drawing = page.locator("main .lettering").first();
  const geometry = () =>
    drawing
      .locator(".glyph-shape path")
      .evaluateAll((paths) =>
        paths.map((path) => [
          path.getAttribute("d"),
          path.getAttribute("stroke-width"),
        ]),
      );
  const before = await geometry();
  await page
    .getByRole("button", { name: "D’autres directions", exact: false })
    .click();
  const variant = page.locator(".variation-card").first();
  await variant.hover();
  await expect.poll(geometry).not.toEqual(before);
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("glyphka.design.v1")),
  ).toBeNull();
  await page.locator(".word-logo").hover();
  await expect.poll(geometry).toEqual(before);
  await variant.click();
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page.locator(".word-logo").hover();
  await expect.poll(geometry).toEqual(before);
});

test("saves five independent presets across reloads and restores a drawing undoably", async ({
  page,
}) => {
  await page.goto("/");
  for (let i = 0; i < 5; i++) {
    await page
      .getByRole("textbox", { name: "Ton texte", exact: true })
      .fill(`P${i}`);
    await page.getByRole("button", { name: "Presets", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Nom du preset", exact: true })
      .fill(`Version ${i + 1}`);
    await page
      .getByRole("button", { name: "Enregistrer le preset", exact: true })
      .click();
    await page.keyboard.press("Escape");
  }
  await page.reload();
  await page.getByRole("button", { name: "Presets", exact: true }).click();
  await expect(page.locator(".preset-row")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "Enregistrer le preset", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Charger Version 1", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Ton texte", exact: true }),
  ).toHaveValue("P0");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Ton texte", exact: true }),
  ).toHaveValue("P4");
  await page.getByRole("button", { name: "Presets", exact: true }).click();
  await page
    .getByRole("button", { name: "Supprimer Version 2", exact: true })
    .click();
  await expect(page.locator(".preset-row")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Enregistrer le preset", exact: true }),
  ).toBeEnabled();
});

test("spotlights letters, returns from a symbol and keeps separate mode zooms", async ({
  page,
}) => {
  await page.goto("/");
  const hits = page.locator("main .glyph-hit"),
    groups = page.locator("main .glyph-shape");
  await hits.nth(1).hover();
  await expect(groups.first()).toHaveCSS("opacity", "0.22");
  await expect(groups.nth(1)).toHaveCSS("opacity", "1");
  await expect(page.locator("main .glyph-underline")).toHaveCount(0);
  await page.getByRole("button", { name: "Zoom avant", exact: true }).click();
  await expect(page.locator(".zoom-trigger")).toHaveText("110%");
  await hits.nth(1).click();
  await expect(page.locator(".drawing-area[data-mode=symbol]")).toBeVisible();
  await expect(page.locator(".zoom-trigger")).toHaveText("100%");
  await page
    .getByRole("button", { name: "Retour au lettrage", exact: true })
    .click();
  await expect(page.locator(".drawing-area[data-mode=wordmark]")).toBeVisible();
  await expect(page.locator(".zoom-trigger")).toHaveText("110%");
  const area = page.locator(".canvas-area");
  await area.hover();
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -220);
  await page.keyboard.up("Control");
  await expect(page.locator(".zoom-trigger")).not.toHaveText("110%");
  expect(await page.evaluate(() => visualViewport!.scale)).toBe(1);
});

test("renders intermediate vector contours and retargets an interrupted morph", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/");
  await page.clock.runFor(500);
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 100)),
  );
  const path = page.locator("main .glyph-shape > g > path[stroke]").first();
  const before = await path.getAttribute("d");
  await page
    .locator(".family")
    .filter({ hasText: /^Circuit$/ })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(path).toHaveAttribute("data-morphing", "true");
  await page.clock.runFor(100);
  const middle = await path.getAttribute("d");
  expect(middle).not.toBe(before);
  await expect(path).toHaveAttribute("data-morphing", "true");
  await page
    .locator(".family")
    .filter({ hasText: /^Ruban$/ })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page.clock.runFor(100);
  const retargeted = await path.getAttribute("d");
  expect(retargeted).not.toBe(middle);
  await page.clock.runFor(400);
  await expect(page.locator("main [data-morphing]")).toHaveCount(0);
  expect(await path.getAttribute("d")).not.toBe(retargeted);
  expect(await page.locator("main .lettering").first().innerHTML()).not.toMatch(
    /NaN|undefined/,
  );
});

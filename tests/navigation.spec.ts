import { expect, test, type Page } from "@playwright/test";

async function sideButton(page: Page, button: "back" | "forward") {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: 600,
      y: 400,
      button,
      buttons: button === "back" ? 8 : 16,
      clickCount: 1,
    });
    await session.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: 600,
      y: 400,
      button,
      buttons: 0,
      clickCount: 1,
    });
  } finally {
    await session.detach();
  }
}

test("navigates into a letter and back/forward with mouse buttons without a click outline", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("main .glyph-hit").nth(2).click();
  const symbol = page.locator('.drawing-area[data-mode="symbol"]');
  const word = page.locator('.drawing-area[data-mode="wordmark"]');
  await expect(symbol).toBeVisible();
  await expect(symbol.locator(".interactive-glyph")).toHaveCSS(
    "outline-style",
    "none",
  );
  const letter = await symbol
    .locator(".interactive-glyph")
    .getAttribute("aria-label");
  await sideButton(page, "back");
  await expect(word).toBeVisible();
  await sideButton(page, "forward");
  await expect(symbol).toBeVisible();
  await expect(symbol.locator(".interactive-glyph")).toHaveAttribute(
    "aria-label",
    letter!,
  );
  await page
    .getByRole("button", { name: "Retour au lettrage", exact: true })
    .click();
  await expect(word).toBeVisible();
  await page.goForward();
  await expect(symbol).toBeVisible();
  await page.goBack();
  await expect(word).toBeVisible();
  await expect(symbol).toHaveCount(0);
  await word.locator(".interactive-glyph").first().focus();
  await page.keyboard.press("Tab");
  await expect(word.locator(".interactive-glyph").nth(1)).toBeFocused();
  await expect(word.locator(".interactive-glyph").nth(1)).toHaveCSS(
    "outline-style",
    "solid",
  );
  expect(errors).toEqual([]);
});

test("pans instantly with middle drag and Space + left/right, then recenters without changing the drawing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zoom avant", exact: true }).click();
  const drawing = page.locator(".drawing-scale");
  const geometry = await drawing
    .locator(".glyph-shape path")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("d")),
    );
  const area = (await page.locator(".canvas-area").boundingBox())!;
  const recenter = page.getByRole("button", {
    name: "Recentrer la vue",
    exact: true,
  });
  await expect(recenter).toHaveCount(0);
  for (const button of ["middle", "left", "right"] as const) {
    const hit = (await page.locator("main .glyph-hit").nth(1).boundingBox())!;
    const x = hit.x + hit.width / 2,
      y = hit.y + hit.height / 2;
    await page.mouse.move(x, y);
    if (button !== "middle") await page.keyboard.down("Space");
    await page.mouse.down({ button });
    await page.mouse.move(x + 250, y + 70, { steps: 8 });
    await expect
      .poll(async () =>
        drawing.evaluate((element) => {
          const matrix = new DOMMatrix(getComputedStyle(element).transform);
          return { x: Math.round(matrix.m41), y: Math.round(matrix.m42) };
        }),
      )
      .toEqual({ x: 250, y: 70 });
    await page.mouse.up({ button });
    if (button !== "middle") await page.keyboard.up("Space");
    await expect(
      page.locator('.drawing-area[data-mode="wordmark"]'),
    ).toBeVisible();
    await expect(recenter).toBeVisible();
    const bounds = (await recenter.boundingBox())!;
    expect(
      Math.abs(bounds.x + bounds.width / 2 - area.x - area.width / 2),
    ).toBeLessThan(2);
    expect(bounds.y - area.y).toBeLessThan(5);
    await recenter.click();
    await expect(recenter).toBeHidden();
    await expect
      .poll(() =>
        drawing.evaluate((element) => {
          const matrix = new DOMMatrix(getComputedStyle(element).transform);
          return [matrix.m41, matrix.m42];
        }),
      )
      .toEqual([0, 0]);
    await expect(page.locator(".zoom-trigger")).toHaveText("110%");
  }
  expect(
    await drawing
      .locator(".glyph-shape path")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("d")),
      ),
  ).toEqual(geometry);
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("glyphka.design.v1")),
  ).toBeNull();
  await page
    .getByRole("button", { name: "Réinitialiser le zoom", exact: true })
    .click();
  await expect(page.locator(".zoom-trigger")).toHaveText("100%");
  await expect(page.locator(".zoom-popover")).toHaveCount(0);
});

test("pans and recenters the 3D camera without rebuilding geometry", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  const scene = page.getByTestId("three-scene");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  const revision = await scene.getAttribute("data-revision");
  const canvas = await scene.locator("canvas").elementHandle();
  for (const button of ["middle", "left", "right"] as const) {
    const box = (await scene.boundingBox())!;
    const x = box.x + box.width * 0.3,
      y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    if (button !== "middle") await page.keyboard.down("Space");
    await page.mouse.down({ button });
    await page.mouse.move(x + 250, y + 80, { steps: 12 });
    await page.mouse.up({ button });
    if (button !== "middle") await page.keyboard.up("Space");
    const recenter = page.getByRole("button", {
      name: "Recentrer la vue",
      exact: true,
    });
    await expect(recenter).toBeVisible();
    await recenter.click();
    await expect(recenter).toBeHidden();
  }
  await expect(scene).toHaveAttribute("data-revision", revision!);
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
});

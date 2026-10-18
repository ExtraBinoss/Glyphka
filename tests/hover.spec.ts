import { expect, test } from "@playwright/test";

test("keeps the latest direction after rapid native pointer changes without saving it", async ({
  page,
}) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator(".variation-heading > button").first().hover();
  const cards = page.locator(".variation-card");
  await expect(cards.last()).toHaveCSS("transform", "none");
  const boxes = await Promise.all(
    (await cards.all()).map((card) => card.boundingBox()),
  );
  const original = await page
    .locator(".drawing-area .glyph-shape path")
    .evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));
  for (let i = 0; i < 40; i++) {
    const box = boxes[i % 4]!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  }
  const expected = await cards
    .last()
    .locator(".glyph-shape path")
    .evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));
  await expect
    .poll(() =>
      page
        .locator(".drawing-area .glyph-shape path")
        .evaluateAll((paths) => paths.map((path) => path.getAttribute("d"))),
    )
    .toEqual(expected);
  expect(expected).not.toEqual(original);
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("glyphka.design.v1")),
  ).toBeNull();
});

test("keeps directions open across the funnel to the die and closes outside it", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "D’autres directions",
    exact: false,
  });
  await trigger.hover();
  const tray = page.locator(".variations");
  await expect(tray).toHaveClass(/expanded/);
  const button = (await trigger.boundingBox())!;
  const die = (await page.locator(".variation-refresh").boundingBox())!;
  const bridge = (await page.locator(".variation-bridge").boundingBox())!;
  // Allow sideways jitter in the wide end and across the trigger/die gap.
  for (const point of [
    { x: bridge.x + bridge.width * 0.2, y: bridge.y + 8 },
    { x: bridge.x + bridge.width * 0.8, y: bridge.y + 8 },
    { x: button.x + button.width / 2, y: button.y - 16 },
    { x: button.x + button.width + 4, y: button.y + button.height / 2 },
    { x: die.x + die.width / 2, y: button.y - 16 },
  ]) {
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(200);
    await expect(tray).toHaveClass(/expanded/);
  }
  await page.locator(".variation-card").first().hover();
  await page.mouse.move(button.x + button.width / 2, button.y - 6);
  await page.waitForTimeout(200);
  await expect(tray).toHaveClass(/expanded/);
  // This point is inside the rectangle, but outside the clipped funnel.
  await page.mouse.move(bridge.x + 2, button.y - 6);
  await expect(tray).toHaveClass(/collapsed/);
  await expect(page.locator(".variation-bridge")).toHaveCount(0);
});

test("animates the sidebar with layout projection and hides text before closing", async ({
  page,
}) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const rail = page.locator(".rail");
  await expect(rail).toHaveCSS("width", "58px");
  await rail.hover();
  await expect(rail).toHaveAttribute("data-expanded", "true");
  await expect(rail).toHaveCSS("width", "158px");
  await expect(rail.locator(".rail-label").first()).toHaveCSS("opacity", "1");
  // Reverse the transition repeatedly, including before it completes.
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(400, 80);
    await page.waitForTimeout(40);
    await rail.hover();
    await page.waitForTimeout(40);
  }
  await page.mouse.move(400, 80);
  await expect(rail.locator(".rail-label").first()).toHaveCSS("opacity", "0");
  await expect(rail).toHaveCSS("width", "58px");
  await expect
    .poll(() =>
      rail.evaluate((node) => {
        const m = new DOMMatrix(getComputedStyle(node).transform);
        return [m.a, m.d];
      }),
    )
    .toEqual([1, 1]);
  await expect(rail.locator(".rail-label").first()).toHaveCSS(
    "visibility",
    "hidden",
  );
  await expect(rail).toHaveCSS("overflow", "hidden");
});

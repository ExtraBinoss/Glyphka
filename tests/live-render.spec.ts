import { expect, test } from "@playwright/test";

test("reveals directions upward on hover without moving the trigger and closes on leave", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const trigger = page.getByRole("button", {
    name: "D’autres directions",
    exact: false,
  });
  const geometry = () =>
    page
      .locator(".drawing-area .glyph-shape path")
      .evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));
  const originalDrawing = await geometry();
  const original = (await trigger.boundingBox())!;
  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".variation-card")).toHaveCount(4);
  const opened = (await trigger.boundingBox())!;
  expect(opened.x).toBeCloseTo(original.x, 0);
  expect(opened.y).toBeCloseTo(original.y, 0);
  const cards = (await page.locator(".variation-grid").boundingBox())!;
  expect(cards.y + cards.height).toBeLessThanOrEqual(opened.y);
  await page.locator(".variation-card").first().hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect.poll(geometry).not.toEqual(originalDrawing);
  await trigger.hover();
  await expect.poll(geometry).toEqual(originalDrawing);
  const refresh = page.getByRole("button", {
    name: "Nouvelles variantes",
    exact: true,
  });
  await expect(refresh.locator("svg")).toHaveClass(/dice-5/);
  const first = await page
    .locator(".variation-card")
    .first()
    .getAttribute("aria-label");
  await refresh.click();
  await expect.poll(geometry).toEqual(originalDrawing);
  await expect(page.locator(".variation-card")).toHaveCount(4);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.locator(".word-logo").hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".variation-card")).toHaveCount(0);
  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const row = (await page.locator(".variations").boundingBox())!;
  await page.mouse.move(row.x + 8, row.y + row.height / 2);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".variation-card")).toHaveCount(0);
  expect(first).toBeTruthy();
});

test("updates the 3D background during a color gesture, controls rotation speed and preserves the background in previews", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  const scene = page.getByTestId("three-scene");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  const revision = await scene.getAttribute("data-revision");
  await expect(scene).toHaveAttribute("data-background", "transparent");
  await page
    .getByRole("switch", { name: "Fond transparent", exact: true })
    .click();
  const original = (await scene.getAttribute("data-background"))!;
  await page.getByRole("button", { name: "Arrière-plan", exact: true }).click();
  const metrics = await page.evaluateHandle(() => {
    const samples: number[] = [];
    let input = 0;
    const move = (event: PointerEvent) => {
      if (
        event.buttons === 1 &&
        event.target instanceof Element &&
        event.target.closest('[data-slot="color-picker-area"]')
      )
        input = performance.now();
    };
    document.addEventListener("pointermove", move, true);
    const observer = new MutationObserver(() => {
      if (input) samples.push(performance.now() - input);
    });
    observer.observe(document.querySelector('[data-testid="three-scene"]')!, {
      attributes: true,
      attributeFilter: ["data-background"],
    });
    return {
      samples,
      dispose: () => {
        observer.disconnect();
        document.removeEventListener("pointermove", move, true);
      },
    };
  });
  try {
    const area = (await page
      .locator('[data-slot="color-picker-area"]')
      .boundingBox())!;
    await page.mouse.move(
      area.x + area.width * 0.3,
      area.y + area.height * 0.3,
    );
    await page.mouse.down();
    await page.mouse.move(
      area.x + area.width * 0.8,
      area.y + area.height * 0.7,
      { steps: 12 },
    );
    await expect(scene).not.toHaveAttribute("data-background", original);
    await expect(scene).toHaveAttribute("data-revision", revision!);
    await page.mouse.up();
    const samples = await metrics.evaluate((value) => value.samples);
    expect(samples.length).toBeGreaterThan(2);
    await testInfo.attach("background-input-to-scene-ms", {
      body: JSON.stringify(samples),
      contentType: "application/json",
    });
  } finally {
    await metrics.evaluate((value) => value.dispose());
    await metrics.dispose();
  }
  const changed = (await scene.getAttribute("data-background"))!;
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(scene).toHaveAttribute("data-background", original);
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(scene).toHaveAttribute("data-background", changed);
  await page
    .getByRole("switch", { name: "Rotation automatique", exact: true })
    .click();
  const speed = page.getByRole("slider", {
    name: "Vitesse de rotation",
    exact: true,
  });
  await expect(speed).toBeVisible();
  await speed.focus();
  await page.keyboard.down("ArrowRight");
  await expect(scene).toHaveAttribute("data-rotation-speed", "0.8");
  await page.keyboard.up("ArrowRight");
  await page
    .getByRole("switch", { name: "Rotation automatique", exact: true })
    .click();
  await expect(speed).toBeHidden();
  await expect(scene).toHaveAttribute("data-revision", revision!);
  await page
    .getByRole("button", { name: "D’autres directions", exact: false })
    .hover();
  await page.locator(".variation-card").first().hover();
  await expect(scene).toHaveAttribute("data-background", changed);
  await page.locator(".word-logo").hover();
  await expect(scene).toHaveAttribute("data-background", changed);
  expect(errors).toEqual([]);
});

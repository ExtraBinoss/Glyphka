import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { DEFAULT_DESIGN } from "../src/engine/model";

test.use({
  hasTouch: true,
  isMobile: true,
  launchOptions: { args: ["--enable-gpu", "--enable-unsafe-swiftshader"] },
});

async function exportedBounds(page: Page) {
  await page.getByRole("button", { name: "Export", exact: true }).tap();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "PNG", exact: true }).tap(),
  ]);
  const data = await readFile((await download.path())!);
  const bounds = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width,
      right = 0,
      top = canvas.height,
      bottom = 0;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++)
        if (pixels[(y * canvas.width + x) * 4 + 3] > 100) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    return {
      left,
      right,
      top,
      bottom,
      width: canvas.width,
      height: canvas.height,
    };
  }, data.toString("base64"));
  await page.keyboard.press("Escape");
  return bounds;
}

test("uses a compact mobile dock, centers 2D and frames complete 3D geometry after resize", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    (design) =>
      localStorage.setItem("glyphka.design.v1", JSON.stringify(design)),
    {
      ...DEFAULT_DESIGN,
      render: {
        ...DEFAULT_DESIGN.render,
        depth: 64,
        bevel: 8,
        rotationX: 8,
        rotationY: -12,
        shadow: 0,
      },
    },
  );
  await page.goto("/");
  await page.waitForTimeout(350);
  const toolbar = page.locator(".canvas-toolbar");
  expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(60);
  const area = (await page.locator(".canvas-area").boundingBox())!;
  const drawing = (await page.locator(".drawing-scale").boundingBox())!;
  expect(
    Math.abs(drawing.y + drawing.height / 2 - area.y - area.height / 2),
  ).toBeLessThan(1);
  expect(
    Math.abs(drawing.x + drawing.width / 2 - area.x - area.width / 2),
  ).toBeLessThan(1);
  expect(area.height).toBeGreaterThan(844 * 0.65);
  await page.getByRole("button", { name: "Vue et repères", exact: true }).tap();
  await page.getByRole("button", { name: "Zoom avant", exact: true }).tap();
  await page
    .getByRole("button", { name: "Réinitialiser le zoom", exact: true })
    .tap();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "3D", exact: true }).tap();
  const scene = page.getByTestId("three-scene");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  const revision = await scene.getAttribute("data-revision");
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    const canvas = (await scene.boundingBox())!;
    const available = (await page.locator(".canvas-area").boundingBox())!;
    expect(canvas.height / available.height).toBeGreaterThan(0.98);
    expect(canvas.width / available.width).toBeGreaterThan(0.98);
    const bounds = await exportedBounds(page);
    expect(bounds.left / bounds.width).toBeGreaterThan(0.025);
    expect(bounds.right / bounds.width).toBeLessThan(0.975);
    expect(bounds.top / bounds.height).toBeGreaterThan(0.025);
    expect(bounds.bottom / bounds.height).toBeLessThan(0.975);
    expect((bounds.right - bounds.left) / bounds.width).toBeGreaterThan(0.7);
    await expect(scene).toHaveAttribute("data-revision", revision!);
    await page.screenshot({
      path: `artifacts/mobile-three-${viewport.width}.png`,
    });
  }
});

test("pinches and pans in 2D and 3D, then recenters without residual drift", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const session = await page.context().newCDPSession(page);
  const area = page.locator(".canvas-area");
  const recenter = page.getByRole("button", {
    name: "Recentrer la vue",
    exact: true,
  });
  try {
    for (const mode of ["2D", "3D"]) {
      await page.getByRole("button", { name: mode, exact: true }).tap();
      if (mode === "3D")
        await expect(page.getByTestId("three-scene")).toHaveAttribute(
          "data-ready",
          "true",
          { timeout: 30000 },
        );
      const box = (await area.boundingBox())!;
      const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: x - 40, y, id: 1 }],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: x - 40, y, id: 1 },
          { x: x + 40, y, id: 2 },
        ],
      });
      for (let i = 1; i <= 8; i++) {
        const radius = 40 + i * 3.75;
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: x - radius, y: y + i * 25, id: 1 },
            { x: x + radius, y: y + i * 25, id: 2 },
          ],
        });
        await page.waitForTimeout(16);
      }
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect(area).not.toHaveAttribute("data-pinching", "true");
      await expect(recenter).toBeVisible();
      await page
        .getByRole("button", { name: "Vue et repères", exact: true })
        .tap();
      const zoom = page.getByRole("button", {
        name: "Réinitialiser le zoom",
        exact: true,
      });
      expect(Number.parseInt((await zoom.textContent())!)).toBeGreaterThan(165);
      await page.keyboard.press("Escape");
      await recenter.tap();
      await expect(recenter).toBeHidden();
      await page.waitForTimeout(600);
      await expect(recenter).toBeHidden();
      if (mode === "2D") {
        const drawing = (await page.locator(".drawing-scale").boundingBox())!;
        expect(
          Math.abs(drawing.x + drawing.width / 2 - box.x - box.width / 2),
        ).toBeLessThan(1);
        expect(
          Math.abs(drawing.y + drawing.height / 2 - box.y - box.height / 2),
        ).toBeLessThan(1);
      }
      await page
        .getByRole("button", { name: "Vue et repères", exact: true })
        .tap();
      await zoom.tap();
      await page.keyboard.press("Escape");
    }
  } finally {
    await session.detach();
  }
});

test("keeps displaying completed geometry while a thickness slider is still held", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  const scene = page.getByTestId("three-scene");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await page.getByRole("button", { name: "Réglages", exact: true }).tap();
  const slider = page.getByRole("slider", { name: "Épaisseur", exact: true });
  await slider.scrollIntoViewIfNeeded();
  const field = slider.locator(
    'xpath=ancestor::div[contains(@class,"range-field")]',
  );
  const track = (await field
    .locator('[data-slot="slider-track"]')
    .boundingBox())!;
  const thumb = (await slider.boundingBox())!;
  const revision = Number(await scene.getAttribute("data-revision"));
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 15; i++) {
    await page.mouse.move(
      track.x + track.width * (0.25 + i * 0.04),
      thumb.y + thumb.height / 2,
    );
    await page.waitForTimeout(25);
  }
  await expect
    .poll(async () => Number(await scene.getAttribute("data-revision")))
    .toBeGreaterThan(revision + 1);
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-ready", "true");
  await expect(
    page.getByRole("dialog", { name: "Réglages" }),
  ).not.toHaveAttribute("data-adjusting", "true");
});

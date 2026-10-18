import { expect, test } from "@playwright/test";

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
  reducedMotion: "no-preference",
});

test("reveals the canvas while a live slider changes only the artwork, then commits one edit", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  try {
    await page.goto("/?profile=1");
    await page.waitForTimeout(2600);
    await page.getByRole("button", { name: "Réglages", exact: true }).tap();
    const sheet = page.getByRole("dialog", { name: "Réglages", exact: true });
    const slider = sheet.getByRole("slider", {
      name: "Épaisseur",
      exact: true,
    });
    await slider.scrollIntoViewIfNeeded();
    const field = slider.locator(
      'xpath=ancestor::div[contains(@class,"range-field")]',
    );
    const track = (await field
      .locator('[data-slot="slider-track"]')
      .boundingBox())!;
    const thumb = (await slider.boundingBox())!;
    const start = {
      x: thumb.x + thumb.width / 2,
      y: thumb.y + thumb.height / 2,
      id: 1,
    };
    const beforeField = (await field.boundingBox())!;
    const previews = () =>
      sheet
        .locator(".alternates path")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")));
    const geometry = () =>
      page
        .locator(".drawing-area .glyph-shape path")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")));
    const beforeGeometry = await geometry();
    const beforeStorage = await page.evaluate(() =>
      localStorage.getItem("glyphka.design.v1"),
    );
    await page.evaluate(() => {
      const state = { input: 0, samples: [] as number[] };
      Object.assign(window, { sliderPerformance: state });
      document.addEventListener(
        "pointermove",
        (event) => {
          if (event.buttons === 1) state.input = performance.now();
        },
        true,
      );
      new MutationObserver(() => {
        if (state.input) {
          state.samples.push(performance.now() - state.input);
          state.input = 0;
        }
      }).observe(document.querySelector(".drawing-area")!, {
        attributes: true,
        subtree: true,
        attributeFilter: ["d", "transform"],
      });
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    await expect(sheet).toHaveAttribute("data-adjusting", "true");
    await expect(field).toHaveAttribute("data-peek-active", "");
    await expect(sheet.locator('[data-slot="drawer-surface"]')).toHaveCSS(
      "opacity",
      "0",
    );
    await expect(page.locator('[data-slot="drawer-overlay"]')).toHaveCSS(
      "opacity",
      "0",
    );
    const beforePreviews = await previews();
    for (let i = 1; i <= 16; i++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { ...start, x: track.x + track.width * (0.2 + i * 0.04) },
        ],
      });
      await page.waitForTimeout(8);
    }
    const liveValue = Number(await slider.getAttribute("aria-valuenow"));
    expect(liveValue).toBeGreaterThan(28);
    await expect(field.getByRole("textbox")).toHaveValue(String(liveValue));
    expect(await geometry()).not.toEqual(beforeGeometry);
    expect(await previews()).toEqual(beforePreviews);
    expect(
      await page.evaluate(() => localStorage.getItem("glyphka.design.v1")),
    ).toBe(beforeStorage);
    expect((await field.boundingBox())!.y).toBeCloseTo(beforeField.y, 0);
    await page.screenshot({ path: "artifacts/mobile-slider-peek.png" });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(sheet).not.toHaveAttribute("data-adjusting", "true");
    await expect(sheet.locator('[data-slot="drawer-surface"]')).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(sheet).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("glyphka.design.v1") || "{}")
              .weight,
        ),
      )
      .toBe(liveValue);
    const samples = await page.evaluate(
      () =>
        (window as unknown as { sliderPerformance: { samples: number[] } })
          .sliderPerformance.samples,
    );
    const sorted = [...samples].sort((a, b) => a - b);
    const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)];
    console.info("slider input to SVG, CPU 4x:", {
      samples: samples.length,
      p95,
    });
    await testInfo.attach("input-to-svg-ms", {
      body: JSON.stringify(samples),
      contentType: "application/json",
    });
    expect(samples.length).toBeGreaterThan(5);
    expect(p95).toBeLessThan(120);
    await sheet.getByRole("button", { name: "Fermer", exact: true }).tap();
    await page.getByRole("button", { name: "Annuler", exact: true }).tap();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("glyphka.design.v1") || "{}")
              .weight,
        ),
      )
      .toBe(23);
    await expect(
      page.getByRole("button", { name: "Annuler", exact: true }),
    ).toBeDisabled();
  } finally {
    await session.detach();
  }
});

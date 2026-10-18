import { expect, test } from "@playwright/test";

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
  reducedMotion: "no-preference",
});

test("opens a prepared inspector promptly and follows touch movement without easing", async ({
  page,
}) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  try {
    await page.goto("/");
    await expect(page.locator("[data-properties-trigger]")).toBeVisible();
    await page.waitForTimeout(2600);
    const popup = page.locator('[data-slot="drawer-popup"]');
    await expect(popup).toBeHidden();
    expect(
      await popup.evaluate((node) => node.getBoundingClientRect().height),
    ).toBeGreaterThan(400);
    await page.evaluate(() => {
      const state = { started: 0, times: [] as number[] };
      Object.assign(window, { drawerPerformance: state });
      document
        .querySelector("[data-properties-trigger]")!
        .addEventListener(
          "pointerup",
          () => (state.started = performance.now()),
          { capture: true },
        );
      const popup = document.querySelector<HTMLElement>(
        '[data-slot="drawer-popup"]',
      )!;
      new MutationObserver(() => {
        if (!popup.hidden)
          requestAnimationFrame(() =>
            state.times.push(performance.now() - state.started),
          );
      }).observe(popup, { attributes: true, attributeFilter: ["hidden"] });
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.locator("[data-properties-trigger]").tap();
      await expect(popup).toBeVisible();
      await page.waitForTimeout(400);
      const handle = popup.locator('[data-slot="drawer-swipe-handle"]');
      const box = (await handle.boundingBox())!;
      const startTop = (await popup.boundingBox())!.y;
      const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + 2, id: 1 }],
      });
      let baseline = 0;
      for (const distance of [25, 60, 100]) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y + distance, id: 1 }],
        });
        const state = await popup.evaluate((node) => ({
          top: node.getBoundingClientRect().y,
          easing: getComputedStyle(node).transitionDuration,
          swiping: node.hasAttribute("data-swiping"),
        }));
        expect(state.swiping).toBe(true);
        expect(state.easing).toBe("0s");
        if (distance === 25) baseline = distance - (state.top - startTop);
        else
          expect(
            Math.abs(state.top - startTop - (distance - baseline)),
          ).toBeLessThan(6);
      }
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + 420, id: 1 }],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect(popup).toBeHidden();
      await page.waitForTimeout(200);
    }
    const times = await page.evaluate(
      () =>
        (window as unknown as { drawerPerformance: { times: number[] } })
          .drawerPerformance.times,
    );
    console.info("drawer first visible frame, CPU 4x:", times);
    expect(times).toHaveLength(2);
    expect(Math.max(...times)).toBeLessThan(200);
  } finally {
    await session.detach();
  }
});

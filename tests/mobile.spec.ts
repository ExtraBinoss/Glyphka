import { expect, test, type Page, type Locator } from "@playwright/test";

test.use({ hasTouch: true, isMobile: true });

async function dismissWithTouch(page: Page, handle: Locator, direction = 1) {
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let i = 1; i <= 12; i++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x,
            y:
              y +
              (direction *
                (i * Math.max(280, page.viewportSize()!.height * 0.55))) /
                12,
            id: 1,
          },
        ],
      });
      if (i === 4 && direction === 1)
        await expect
          .poll(() =>
            handle.evaluate(
              (node) => getComputedStyle(node, "::after").opacity,
            ),
          )
          .toBe("1");
      await page.waitForTimeout(12);
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
]) {
  test(`mobile navigation and draggable properties at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const rail = page.getByRole("navigation");
    for (const label of ["Lettrage", "Symbole", "Formes", "À propos"]) {
      const button = rail.getByRole("button", { name: label, exact: true });
      await expect(button).toBeVisible();
      await expect(button.locator(".rail-label")).toHaveCSS("opacity", "1");
    }
    const nav = (await rail.boundingBox())!;
    expect(nav.y).toBeGreaterThan(viewport.height - 100);
    expect(nav.y + nav.height).toBeLessThanOrEqual(viewport.height);
    const trigger = page.getByRole("button", { name: "Réglages", exact: true });
    const entry = (await trigger.boundingBox())!;
    expect(entry.y).toBeGreaterThan(viewport.height - 150);
    expect(entry.y + entry.height).toBeLessThan(nav.y);
    const tools = (await page.locator(".canvas-toolbar").boundingBox())!;
    expect(tools.x + tools.width + 8).toBeLessThanOrEqual(entry.x);
    expect(tools.height).toBeLessThanOrEqual(60);
    for (const button of await page
      .locator(".canvas-toolbar button:visible")
      .all()) {
      const box = (await button.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(tools.x);
      expect(box.x + box.width).toBeLessThanOrEqual(tools.x + tools.width);
    }
    const exporter = (await page
      .getByRole("button", { name: "Export", exact: true })
      .boundingBox())!;
    await expect(
      page.getByRole("button", { name: "Export", exact: true }),
    ).toHaveText(/Export/);
    expect(exporter.y).toBeLessThan(65);
    expect(exporter.x + exporter.width).toBeGreaterThan(viewport.width - 20);
    await page.screenshot({
      path: `artifacts/mobile-editor-${viewport.width}.png`,
    });
    await trigger.tap();
    const sheet = page.getByRole("dialog", { name: "Réglages", exact: true });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("button", { name: "Fermer", exact: true }).locator("svg"),
    ).toHaveCount(0);
    const bounds = (await sheet.boundingBox())!;
    expect(bounds.x).toBe(0);
    expect(bounds.width).toBe(viewport.width);
    expect(bounds.y).toBeGreaterThan(0);
    await page.screenshot({
      path: `artifacts/mobile-properties-${viewport.width}.png`,
    });
    const text = sheet.getByRole("textbox", { name: "Ton texte", exact: true });
    await text.fill("MOBILE");
    await expect(text).toHaveValue("MOBILE");
    await sheet.getByRole("button", { name: "#2563eb", exact: true }).tap();
    await expect(sheet).toBeVisible();
    await dismissWithTouch(
      page,
      sheet.locator('[data-slot="drawer-swipe-handle"]'),
    );
    await expect(sheet).toBeHidden();
    await expect(
      page.getByRole("img", { name: "MOBILE", exact: true }),
    ).toBeVisible();
    await trigger.tap();
    await expect(text).toHaveValue("MOBILE");
    await sheet.getByRole("button", { name: "Fermer", exact: true }).tap();
    await expect(sheet).toBeHidden();
    await rail.getByRole("button", { name: "Formes", exact: true }).tap();
    await expect(page.locator(".shape-canvas")).toBeVisible();
    const dot = page.locator('[data-shape-id="dot"]');
    await dot.locator("path").first().tap();
    await expect(dot.locator(".touch-shape-handle")).toHaveCount(5);
    const hit = (await dot.locator("path").first().boundingBox())!;
    const previous = await dot.getAttribute("transform");
    const session = await page.context().newCDPSession(page);
    try {
      const start = {
        x: hit.x + hit.width / 2,
        y: hit.y + hit.height / 2,
        id: 1,
      };
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [start],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...start, x: start.x + 35, y: start.y - 25 }],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } finally {
      await session.detach();
    }
    await expect(dot).not.toHaveAttribute("transform", previous!);
    await expect
      .poll(
        async () =>
          JSON.parse(
            (await page.evaluate(() =>
              localStorage.getItem("glyphka.design.v1"),
            )) || "{}",
          ).shapes?.find((shape: { id: string }) => shape.id === "dot")?.x,
      )
      .toBeGreaterThan(207);
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("glyphka.design.v1")!).shapes.find(
        (shape: { id: string }) => shape.id === "dot",
      ),
    );
    expect(stored.width).toBe(28);
    await rail.getByRole("button", { name: "À propos", exact: true }).tap();
    await expect(
      page.getByRole("link", { name: "Plinka", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport.width);
    await page.waitForTimeout(400);
    const about = page.locator("#about");
    const heading = (await about
      .getByRole("heading", { level: 2 })
      .boundingBox())!;
    expect(
      Math.abs(heading.x + heading.width / 2 - viewport.width / 2),
    ).toBeLessThan(1);
    const links = (await page
      .getByRole("link", { name: "Plinka", exact: true })
      .boundingBox())!;
    expect(links.y + links.height).toBeLessThan(nav.y - 8);
    const preferences = about.locator('[data-slot="toggle-group"]');
    for (const group of await preferences.all()) {
      const box = (await group.boundingBox())!;
      expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(
        1,
      );
      expect(box.width).toBeGreaterThan(viewport.width - 100);
    }
    expect(
      await about.evaluate((node) => node.scrollHeight),
    ).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({
      path: `artifacts/mobile-about-${viewport.width}.png`,
    });
  });
}

test("scrolls through every direction with shadows at both edges", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "D’autres directions", exact: false })
    .tap();
  const strip = page.locator(".variation-scroll");
  await expect(strip).toHaveAttribute("data-scroll-top", "false");
  await expect(strip).toHaveAttribute("data-scroll-bottom", "true");
  await expect(page.locator(".variation-card")).toHaveCount(4);
  await strip.hover();
  await page.mouse.wheel(1500, 0);
  await expect(strip).toHaveAttribute("data-scroll-top", "true");
  await expect(strip).toHaveAttribute("data-scroll-bottom", "false");
  await page.screenshot({ path: "artifacts/mobile-variations.png" });
  await page.mouse.wheel(-1500, 0);
  await expect(strip).toHaveAttribute("data-scroll-top", "false");
  await expect(strip).toHaveAttribute("data-scroll-bottom", "true");
});

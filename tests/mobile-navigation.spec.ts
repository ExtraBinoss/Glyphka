import { expect, test } from "@playwright/test";

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
  reducedMotion: "no-preference",
});
test("keeps the moving selection behind the active mobile tab, including hover", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation");
  const buttons = nav.getByRole("button");
  for (let i = 0; i < (await buttons.count()); i++) {
    const button = buttons.nth(i);
    await button.tap();
    await expect(button).toHaveAttribute("aria-current", "page");
    await button.hover();
    await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const indicator = nav.locator(":scope > span[aria-hidden]");
    await expect
      .poll(async () => {
        const a = (await indicator.boundingBox())!,
          b = (await button.boundingBox())!;
        return Math.max(
          Math.abs(a.x - b.x),
          Math.abs(a.y - b.y),
          Math.abs(a.width - b.width),
          Math.abs(a.height - b.height),
        );
      })
      .toBeLessThan(1.1);
  }
});

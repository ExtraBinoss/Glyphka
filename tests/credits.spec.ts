import { expect, test } from "@playwright/test";

test("opens English credits in a shadcn dialog with attribution and keyboard dismissal", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "À propos", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Credits & licenses" });
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Credits & licenses" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL("/");
  const headings = await dialog
    .getByRole("heading", { level: 3 })
    .allTextContents();
  expect(headings).toEqual([
    "Inspiration",
    "How it works",
    "Open source",
    "Built with",
  ]);
  await expect(dialog).toContainText(
    "Paul Nicholson’s geometric identity for Aphex Twin",
  );
  await expect(dialog).toContainText("Johan Gielis’s 2003 mathematical model");
  await expect(dialog).toContainText(
    "Clipper combines contours and subtracts holes",
  );
  await expect(dialog).toContainText("Geometry is built in a worker");
  await expect(
    dialog.getByRole("link", { name: "Glyphka · MIT", exact: true }),
  ).toHaveAttribute("href", "/licenses/Glyphka-MIT.txt");
  for (const link of await dialog.getByRole("link").all()) {
    const href = (await link.getAttribute("href"))!;
    if (href.startsWith("/licenses/")) {
      const response = await request.get(href);
      expect(response.ok()).toBe(true);
      expect(await response.text()).not.toContain("<!doctype html>");
    }
  }
  await dialog.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.getByRole("button", { name: "English", exact: true }).click();
  await trigger.click();
  await expect(dialog).toHaveAttribute("lang", "en");
  await expect(dialog.getByRole("heading", { level: 3 }).first()).toHaveText(
    "Inspiration",
  );
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("keeps credits inside small light and dark viewports with scroll shadows", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "À propos", exact: true }).click();
  for (const theme of ["Clair", "Sombre"]) {
    await page.getByRole("button", { name: theme, exact: true }).click();
    for (const size of [
      { width: 320, height: 568 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: "Credits & licenses" }).click();
      const dialog = page.getByRole("dialog", { name: "Credits & licenses" });
      const body = dialog.getByRole("region", { name: "Credits", exact: true });
      await expect(dialog).toBeVisible();
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(15);
      expect(bounds.y).toBeGreaterThanOrEqual(15);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width - 15);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height - 15);
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await expect(body).toHaveAttribute("data-scroll-bottom", "true");
      await body.hover();
      await page.mouse.wheel(0, 6000);
      await expect(body).toHaveAttribute("data-scroll-top", "true");
      await expect(
        dialog.getByRole("link", { name: "Tailwind CSS", exact: true }),
      ).toBeInViewport();
      await expect(
        dialog.getByRole("link", { name: "Full notices" }),
      ).toBeInViewport();
      await expect(
        dialog.getByRole("button", { name: "Close", exact: true }),
      ).toBeInViewport();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  }
});

import { expect, test } from "@playwright/test";
import { DEFAULT_DESIGN, PRESETS } from "../src/engine/model";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (design) => {
      if (localStorage.getItem("glyphka.presets.v1")) return;
      localStorage.setItem("glyphka.design.v1", JSON.stringify(design));
      localStorage.setItem(
        "glyphka.presets.v1",
        JSON.stringify([
          {
            id: "one",
            name: "Base",
            design,
            mode: "wordmark",
            view: "2d",
            selected: 0,
          },
          {
            id: "two",
            name: "Copy",
            design,
            mode: "wordmark",
            view: "2d",
            selected: 0,
          },
          {
            id: "three",
            name: "Stencil",
            design: { ...design, family: "stencil", text: "STENCIL" },
            mode: "wordmark",
            view: "2d",
            selected: 0,
          },
          {
            id: "four",
            name: "Shape",
            design,
            mode: "shapes",
            view: "2d",
            selected: 0,
          },
          {
            id: "five",
            name: "Volume",
            design: { ...design, text: "PK" },
            mode: "symbol",
            view: "3d",
            selected: 1,
          },
        ]),
      );
      localStorage.setItem("glyphka.preset.active.v1", "two");
    },
    { ...DEFAULT_DESIGN, ...PRESETS.signal, text: "BASE" },
  );
});

test("marks the chosen saved drawing, previews instantly without editing and restores on leave", async ({
  page,
}) => {
  await page.goto("/");
  const text = page.getByRole("textbox", { name: "Ton texte", exact: true });
  const saved = await page.evaluate(() =>
    localStorage.getItem("glyphka.design.v1"),
  );
  const trigger = page.getByRole("button", {
    name: "Préréglages",
    exact: true,
  });
  await trigger.click();
  const copy = page.getByRole("button", { name: "Charger Copy", exact: true });
  await expect(copy).toHaveAttribute("aria-pressed", "true");
  const stencil = page.getByRole("button", {
    name: "Charger Stencil",
    exact: true,
  });
  await stencil.hover();
  await expect(page.locator("main .lettering").first()).toHaveAttribute(
    "aria-label",
    "STENCIL",
  );
  await expect(text).toHaveValue("BASE");
  await expect(copy).toHaveAttribute("aria-pressed", "true");
  // Typing a name must not reconstruct the five static preview images.
  const images = await page.locator(".preset-load img").elementHandles();
  await page
    .getByRole("textbox", { name: "Nom du préréglage", exact: true })
    .fill("Draft");
  for (let i = 0; i < images.length; i++)
    expect(
      await images[i].evaluate(
        (image, index) =>
          image === document.querySelectorAll(".preset-load img")[index],
        i,
      ),
    ).toBe(true);
  await expect(page.locator("main .lettering").first()).toHaveAttribute(
    "aria-label",
    "BASE",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("glyphka.design.v1")),
  ).toBe(saved);
  await stencil.click();
  await expect(text).toHaveValue("STENCIL");
  await trigger.click();
  await expect(stencil).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await trigger.click();
  await expect(copy).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Charger Base", exact: true }).click();
  await page.reload();
  await trigger.click();
  await expect(
    page.getByRole("button", { name: "Charger Base", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("previews shape and 3D scenes without changing the active editor or saved drawing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Préréglages", exact: true }).click();
  await page
    .getByRole("button", { name: "Charger Shape", exact: true })
    .hover();
  await expect(page.locator("main .shape-canvas")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Ton texte", exact: true }),
  ).toHaveValue("BASE");
  await page
    .getByRole("button", { name: "Charger Volume", exact: true })
    .hover();
  await expect(page.getByTestId("three-scene")).toBeVisible();
  await expect(page.getByTestId("three-scene")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(
    page.getByRole("button", { name: "2D", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("textbox", { name: "Nom du préréglage", exact: true })
    .hover();
  await expect(page.locator("main .lettering").first()).toBeVisible();
  await expect(page.locator("main .lettering").first()).toHaveAttribute(
    "aria-label",
    "BASE",
  );
  await expect(
    page.getByRole("button", { name: "Charger Copy", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

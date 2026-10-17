import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { DEFAULT_DESIGN } from "../src/engine/model";
import { serializeSvg } from "../src/engine/geometry";

test("edits text, all geometry controls, letter variants, and history", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Ton texte", exact: true })
    .fill("ORBES");
  await expect(
    page.getByRole("img", { name: "ORBES", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Épaisseur · value", exact: true })
    .fill("31");
  await page
    .getByRole("textbox", { name: "Épaisseur · value", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("slider", { name: "Épaisseur", exact: true }),
  ).toHaveAttribute("aria-valuenow", "31");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Épaisseur · value", exact: true }),
  ).toHaveValue("23");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Épaisseur · value", exact: true }),
  ).toHaveValue("31");
  const original = await page.locator("main .lettering").first().innerHTML();
  await page.getByRole("button", { name: "Dessin 4", exact: true }).click();
  expect(await page.locator("main .lettering").first().innerHTML()).not.toBe(
    original,
  );
  await expect(
    page.getByRole("button", { name: "Dessin 4", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("glyphka.design.v1") || "{}").weight ===
      31,
  );
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Ton texte", exact: true }),
  ).toHaveValue("ORBES");
});

test("updates the SVG during a drag and undoes the entire gesture once", async ({
  page,
}) => {
  await page.goto("/");
  const slider = page.getByRole("slider", { name: "Épaisseur", exact: true }),
    box = await slider.locator("..").boundingBox();
  expect(box).not.toBeNull();
  const track = await page
    .locator("[data-slot=slider-track]")
    .first()
    .boundingBox();
  const initial = await page
    .locator("main .lettering path[stroke-width]")
    .first()
    .getAttribute("stroke-width");
  await page.mouse.move(track!.x + track!.width * 0.3, track!.y + 2);
  await page.mouse.down();
  await page.mouse.move(track!.x + track!.width * 0.85, track!.y + 2, {
    steps: 12,
  });
  expect(
    await page
      .locator("main .lettering path[stroke-width]")
      .first()
      .getAttribute("stroke-width"),
  ).not.toBe(initial);
  await page.mouse.up();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  expect(
    await page
      .locator("main .lettering path[stroke-width]")
      .first()
      .getAttribute("stroke-width"),
  ).toBe(initial);
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeDisabled();
});

test("drags, resizes, duplicates and subtracts vector parts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Formes", exact: true }).click();
  await page.locator(".layer").last().click();
  const shape = page.locator("[data-shape-id=stem]"),
    hit = await shape.locator("path").first().boundingBox();
  const before = await page
    .getByRole("textbox", { name: "X · value", exact: true })
    .inputValue();
  await page.mouse.move(hit!.x + hit!.width * 0.5, hit!.y + hit!.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(
    hit!.x + hit!.width * 0.5 + 32,
    hit!.y + hit!.height * 0.7 + 14,
    { steps: 10 },
  );
  await page.mouse.up();
  expect(
    await page
      .getByRole("textbox", { name: "X · value", exact: true })
      .inputValue(),
  ).not.toBe(before);
  const handle = shape.locator('[data-handle="1,1"]'),
    hb = await handle.boundingBox();
  const width = await page
    .getByRole("textbox", { name: "Largeur · value", exact: true })
    .inputValue();
  await page.mouse.move(hb!.x + hb!.width / 2, hb!.y + hb!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    hb!.x + hb!.width / 2 + 20,
    hb!.y + hb!.height / 2 + 10,
    { steps: 6 },
  );
  await page.mouse.up();
  expect(
    await page
      .getByRole("textbox", { name: "Largeur · value", exact: true })
      .inputValue(),
  ).not.toBe(width);
  await page.getByRole("button", { name: "Dupliquer", exact: true }).click();
  await expect(page.locator(".layer")).toHaveCount(5);
  await page.getByRole("button", { name: "Découpe", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Découpe", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.locator(".layer")).toHaveCount(4);
  const original = await page.locator(".shape-canvas").innerHTML();
  await page.getByRole("button", { name: "Aléatoire", exact: true }).click();
  expect(await page.locator(".shape-canvas").innerHTML()).not.toBe(original);
});

test("uses a real color panel, saves custom swatches and applies color immediately", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Couleur personnalisée", exact: true })
    .click();
  await expect(page.locator("[data-slot=color-picker-area]")).toBeVisible();
  const hex = page.locator("[data-slot=color-picker-fields] input").first();
  await hex.fill("ea5678");
  await hex.press("Enter");
  await expect(
    page.locator("main .lettering .paint-surface").first(),
  ).toHaveAttribute("fill", "#ea5678");
  await page
    .getByRole("button", { name: "Ajouter à la palette", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "#ea5678", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .locator(".panel-scroll")
    .evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(
    page.getByRole("button", { name: "#ea5678", exact: true }),
  ).toBeVisible();
});

test("exports actual standalone SVG and transparent PNG", async ({ page }) => {
  await page.goto("/");
  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "SVG", exact: true }).click(),
  ]);
  const svg = await readFile((await svgDownload.path())!, "utf8");
  expect(svg).toContain("<svg");
  expect(svg).not.toContain("currentColor");
  expect(svg).not.toContain("<text");
  await page.getByRole("button", { name: "Télécharger", exact: true }).click();
  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "PNG 2×", exact: true }).click(),
  ]);
  const png = await readFile((await pngDownload.path())!);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(2400);
  expect(png.readUInt32BE(20)).toBeGreaterThan(0);
});

test("cutouts remove alpha instead of painting the background", async ({
  page,
}) => {
  await page.goto("/");
  const svg = serializeSvg(
    {
      ...DEFAULT_DESIGN,
      shapes: [
        {
          id: "a",
          kind: "capsule",
          x: 300,
          y: 220,
          width: 200,
          height: 200,
          rotation: 0,
          cutout: false,
        },
        {
          id: "b",
          kind: "disc",
          x: 300,
          y: 220,
          width: 80,
          height: 80,
          rotation: 0,
          cutout: true,
        },
      ],
    },
    "shapes",
    "#2563eb",
  );
  const alpha = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = URL.createObjectURL(
      new Blob([source], { type: "image/svg+xml" }),
    );
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 440;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, 600, 440);
    return [
      ctx.getImageData(300, 220, 1, 1).data[3],
      ctx.getImageData(240, 220, 1, 1).data[3],
      ctx.getImageData(0, 0, 1, 1).data[3],
    ];
  }, svg);
  expect(alpha).toEqual([0, 255, 0]);
});

test("about switches language and theme, including system preference back in the editor", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "À propos", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Glyphka", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(
    page.getByRole("button", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("group", { name: "Theme", exact: true })
      .locator("[data-slot=segmented-indicator]"),
  ).toHaveCSS("background-color", "rgb(37, 99, 235)");
  await page.getByRole("button", { name: "System", exact: true }).click();
  await page.getByRole("button", { name: "Lettering", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass("dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass("dark");
  await expect(
    page.getByRole("textbox", { name: "Your text", exact: true }),
  ).toBeVisible();
});

test("fits mobile, opens a properties drawer and keeps About content visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "PLINKA", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Ton texte", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Fermer", exact: true })
    .click();
  await page.getByRole("button", { name: "À propos", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Plinka", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  const link = await page
    .getByRole("link", { name: "Plinka", exact: true })
    .boundingBox();
  expect(link!.y + link!.height).toBeLessThan(750);
  await page.screenshot({ path: "artifacts/mobile-about.png" });
});

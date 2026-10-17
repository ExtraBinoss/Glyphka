import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

test("the die generates new drawings and the alphabet continues beyond four variants", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const initial = await page.locator("main .lettering").first().innerHTML();
  await page.getByRole("button", { name: "Aléatoire", exact: true }).click();
  expect(await page.locator("main .lettering").first().innerHTML()).not.toBe(
    initial,
  );
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Autres dessins", exact: true })
      .click();
  await expect(
    page.getByRole("button", { name: "Dessin 17", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.locator("main .lettering").first().innerHTML(),
  ).not.toContain("NaN");
  expect(errors).toEqual([]);
});

test("a procedural shape changes continuously and the shape list is not capped at 48", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Formes", exact: true }).click();
  await page
    .getByRole("button", { name: "Ajouter une forme", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Générer une forme", exact: true })
    .click();
  await page.keyboard.press("Escape");
  const initial = await page.locator(".shape-canvas").innerHTML();
  await page
    .getByRole("textbox", { name: "Tension · value", exact: true })
    .fill("3.15");
  await page
    .getByRole("textbox", { name: "Tension · value", exact: true })
    .press("Enter");
  expect(await page.locator(".shape-canvas").innerHTML()).not.toBe(initial);
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("glyphka.design.v1") || "{}").shapes
        ?.length === 5,
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("glyphka.design.v1") || "{}"),
  );
  await page.addInitScript((design) => {
    design.shapes = Array.from({ length: 52 }, (_, i) => ({
      ...design.shapes[0],
      id: `part-${i}`,
      x: 200 + i,
    }));
    localStorage.setItem("glyphka.design.v1", JSON.stringify(design));
  }, saved);
  await page.reload();
  await page.getByRole("button", { name: "Formes", exact: true }).click();
  await expect(page.locator(".layer")).toHaveCount(52);
  await page
    .getByRole("button", { name: "Ajouter une forme", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Générer une forme", exact: true })
    .click();
  await expect(page.locator(".layer")).toHaveCount(53);
});

test("extrudes actual geometry, orbits it and exports a nonempty 3D PNG", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  const scene = page.getByTestId("three-scene");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  expect(Number(await scene.getAttribute("data-vertices"))).toBeGreaterThan(
    100,
  );
  const before = createHash("sha256")
    .update(await scene.screenshot())
    .digest("hex");
  const box = await scene.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width * 0.6,
    box!.y + box!.height * 0.59,
    { steps: 15 },
  );
  await page.mouse.up();
  const after = createHash("sha256")
    .update(await scene.screenshot())
    .digest("hex");
  expect(after).not.toBe(before);
  await page
    .getByRole("textbox", { name: "Extrusion · value", exact: true })
    .fill("72");
  await page
    .getByRole("textbox", { name: "Extrusion · value", exact: true })
    .press("Enter");
  await expect(scene).toHaveAttribute("data-depth", "72");
  await page.getByRole("button", { name: "Face", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "PNG", exact: true }).click(),
  ]);
  const png = await readFile((await download.path())!);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBeGreaterThan(800);
  const coloredPixels = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 100) count++;
    return count;
  }, png.toString("base64"));
  expect(coloredPixels).toBeGreaterThan(10000);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "PLINKA", exact: true }),
  ).toBeVisible();
  await expect(scene).toHaveCount(0);
});

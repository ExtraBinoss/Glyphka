import { expect, test } from "@playwright/test";
import { DEFAULT_DESIGN } from "../src/engine/model";
import { generateShapeCandidates } from "../src/engine/generate";

test("renews procedural proposals, inserts the exact preview and keeps base shapes available", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Formes", exact: true }).click();
  await page
    .getByRole("button", { name: "Ajouter une forme", exact: true })
    .first()
    .click();
  const library = page.locator(".shape-popover");
  const candidates = library.locator("[data-shape-candidate]");
  await expect(candidates).toHaveCount(18);
  const before = await candidates.first().locator("path").getAttribute("d");
  await library
    .getByRole("button", { name: "Nouvelles variantes", exact: true })
    .click();
  await expect(candidates.first().locator("path")).not.toHaveAttribute(
    "d",
    before!,
  );
  const candidate = candidates.nth(2);
  const path = (await candidate.locator("path").getAttribute("d"))!;
  await candidate.click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".layer")).toHaveCount(5);
  await expect(
    page.locator(".shape-canvas [data-shape-paint]").last(),
  ).toHaveAttribute("d", path);
  await page
    .getByRole("button", { name: "Ajouter une forme", exact: true })
    .first()
    .click();
  await library
    .getByRole("button", { name: "Formes de base", exact: true })
    .click();
  await expect(candidates).toHaveCount(22);
  await library.getByRole("button", { name: "Cœur", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".layer")).toHaveCount(6);
});

for (const cutout of [false, true])
  test(`edits one ${cutout ? "cutout" : "solid"} shape live among 120 shapes and commits only at release`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    const design = structuredClone(DEFAULT_DESIGN);
    design.shapes = Array.from({ length: 120 }, (_, i) => ({
      ...generateShapeCandidates(i)[0],
      id: `part-${i}`,
      x: 20 + (i % 12) * 48,
      y: 20 + Math.floor(i / 12) * 40,
      width: 30,
      height: 30,
    }));
    design.shapes[119] = {
      ...generateShapeCandidates(17)[0],
      id: "part-119",
      x: 300,
      y: 220,
      width: 160,
      height: 120,
      cutout,
    };
    await page.addInitScript(
      (design) =>
        localStorage.setItem("glyphka.design.v1", JSON.stringify(design)),
      design,
    );
    await page.goto("/?profile");
    await page.getByRole("button", { name: "Formes", exact: true }).click();
    await page.locator(".layer").first().click();
    const shape = page.locator('[data-shape-id="part-119"]');
    const paint = page.locator('[data-shape-paint="part-119"]');
    const beforeTransform = await paint.getAttribute("transform");
    const box = (await shape.locator("path").first().boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 50,
      box.y + box.height / 2 + 20,
      { steps: 30 },
    );
    await expect(paint).not.toHaveAttribute("transform", beforeTransform!);
    await expect(
      page.getByRole("textbox", { name: "X · valeur", exact: true }),
    ).not.toHaveValue("300");
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("glyphka.design.v1")!).shapes[119].x,
      ),
    ).toBe(300);
    await page.mouse.up();
    const moved = await paint.getAttribute("transform");
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(paint).toHaveAttribute("transform", beforeTransform!);
    await page.getByRole("button", { name: "Rétablir", exact: true }).click();
    await expect(paint).toHaveAttribute("transform", moved!);
    const handle = (await shape.locator('[data-handle="1,1"]').boundingBox())!;
    const beforePath = (await paint.getAttribute("d"))!;
    await page.mouse.move(handle.x + 4, handle.y + 4);
    await page.mouse.down();
    await page.mouse.move(handle.x + 28, handle.y + 20, { steps: 30 });
    await expect(paint).not.toHaveAttribute("d", beforePath);
    await expect(shape.locator("path").first()).toHaveAttribute(
      "d",
      (await paint.getAttribute("d"))!,
    );
    await page.mouse.up();
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(paint).toHaveAttribute("d", beforePath);
    const samples = await page.evaluate(() =>
      performance
        .getEntriesByName("glyphka:shapes:gesture")
        .map((entry) => entry.duration),
    );
    expect(samples.length).toBeGreaterThan(40);
    await info.attach("shape-gesture-cpu-ms", {
      body: JSON.stringify(samples),
      contentType: "application/json",
    });
  });

test("the live canvas subtracts cutouts with a single paint mask", async ({
  page,
}) => {
  const design = structuredClone(DEFAULT_DESIGN);
  design.shapes = [
    {
      ...design.shapes[0],
      id: "solid",
      kind: "disc",
      x: 300,
      y: 220,
      width: 200,
      height: 200,
      rotation: 0,
      cutout: false,
    },
    {
      ...design.shapes[0],
      id: "hole",
      kind: "disc",
      x: 300,
      y: 220,
      width: 80,
      height: 80,
      rotation: 0,
      cutout: true,
    },
  ];
  await page.addInitScript(
    (design) =>
      localStorage.setItem("glyphka.design.v1", JSON.stringify(design)),
    design,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Formes", exact: true }).click();
  await expect(page.locator(".shape-canvas [data-shape-paint]")).toHaveCount(2);
  await expect(page.locator(".shape-canvas mask")).toHaveCount(1);
  const alpha = await page
    .locator(".shape-canvas")
    .evaluate(async (element) => {
      const clone = element.cloneNode(true) as SVGSVGElement;
      clone
        .querySelectorAll(".draggable-shape")
        .forEach((node) => node.remove());
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", "600");
      clone.setAttribute("height", "440");
      clone
        .querySelector(".paint-surface")!
        .setAttribute(
          "fill",
          getComputedStyle(element.querySelector(".paint-surface")!).fill,
        );
      const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(clone)], {
          type: "image/svg+xml",
        }),
      );
      try {
        const image = new Image();
        image.src = url;
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
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  expect(alpha).toEqual([0, 255, 0]);
});

import { expect, test } from "@playwright/test";
import { DEFAULT_DESIGN } from "../src/engine/model";

test.use({
  reducedMotion: "no-preference",
  launchOptions: { args: ["--enable-gpu", "--enable-unsafe-swiftshader"] },
});

test("morphs visible letters in a short staggered wave, docks the SVG logo and restores the saved design on every load", async ({
  page,
}) => {
  test.setTimeout(30000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const saved = JSON.stringify({
    ...DEFAULT_DESIGN,
    text: "STUDIO",
    color: "#ff5a1f",
    family: "ribbon",
    weight: 29,
    seed: 741,
    render: { ...DEFAULT_DESIGN.render, depth: 35, roughness: 0.72 },
  });
  await page.addInitScript((saved) => {
    localStorage.setItem("glyphka.design.v1", saved);
    const observation = {
      letters: [] as string[],
      phases: [] as string[],
      paths: {} as Record<string, string[]>,
      landingError: Infinity,
      maxConcurrent: 0,
    };
    Reflect.set(window, "introObservation", observation);
    new MutationObserver(() => {
      const phase = document.documentElement.dataset.glyphkaIntro;
      if (phase && observation.phases.at(-1) !== phase)
        observation.phases.push(phase);
    }).observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-glyphka-intro"],
    });
    let started = false;
    const sample = () => {
      const phase = document.documentElement.dataset.glyphkaIntro;
      if (phase) {
        started = true;
        if (observation.phases.at(-1) !== phase) observation.phases.push(phase);
        const activeLetters = [
          ...document.querySelectorAll<HTMLElement>(
            ".startup-letter[data-animating]",
          ),
        ];
        observation.maxConcurrent = Math.max(
          observation.maxConcurrent,
          activeLetters.length,
        );
        for (const element of activeLetters) {
          const letter = element.dataset.letter!;
          if (!observation.letters.includes(letter))
            observation.letters.push(letter);
          const paths = (observation.paths[letter] ??= []);
          const path = [...element.querySelectorAll("path")]
            .map((node) => node.getAttribute("d"))
            .join(" ");
          if (!paths.includes(path)) paths.push(path);
        }
        if (phase === "docking") {
          const from = document
            .querySelector(".startup-word")!
            .getBoundingClientRect();
          const to = document
            .querySelector(".studio-header .brand-word")!
            .getBoundingClientRect();
          observation.landingError = Math.min(
            observation.landingError,
            Math.abs(from.x - to.x) +
              Math.abs(from.y - to.y) +
              Math.abs(from.width - to.width),
          );
        }
      }
      if (!started || phase) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, saved);
  await page.goto("/?profile", { waitUntil: "commit" });
  const intro = page.locator(".startup-intro");
  await expect(page.locator("html")).toHaveAttribute(
    "data-glyphka-intro",
    "playing",
  );
  await expect(intro.locator(".startup-letter")).toHaveCount(7);
  await expect(intro.locator(".startup-reel")).toHaveCount(0);
  await expect(page.locator(".studio")).toHaveAttribute("inert", "");
  expect(
    await intro.locator(".startup-letter").evaluateAll((letters) =>
      letters.every((letter) => {
        const box = letter.getBoundingClientRect();
        return (
          box.width > 0 &&
          box.height > 0 &&
          Number(getComputedStyle(letter).opacity) > 0
        );
      }),
    ),
  ).toBe(true);
  await expect(intro).toHaveCount(0, { timeout: 8000 });
  const observation = await page.evaluate(() =>
    Reflect.get(window, "introObservation"),
  );
  expect(observation.letters.join("")).toBe("GLYPHKA");
  expect(observation.maxConcurrent).toBeGreaterThan(1);
  expect(observation.phases).toEqual(
    expect.arrayContaining(["playing", "settled", "docking"]),
  );
  for (const paths of Object.values(observation.paths) as string[][]) {
    expect(paths.length).toBeGreaterThan(3);
    expect(paths.join(" ")).not.toMatch(/NaN|Infinity|undefined/);
  }
  expect(observation.landingError).toBeLessThan(2);
  const languages = await page
    .locator(".studio-header .brand-letter")
    .evaluateAll((letters) =>
      letters.map((node) => node.getAttribute("data-language")),
    );
  expect(languages).toEqual(Array(7).fill("stencil"));
  await expect(page.locator("html")).not.toHaveAttribute("data-glyphka-intro");
  await expect(page.locator(".studio")).not.toHaveAttribute("inert");
  await expect(page.locator(".studio-header .word-logo")).toBeVisible();
  await expect(page.locator(".studio-header .brand-word")).toHaveCSS(
    "color",
    "rgb(29, 29, 31)",
  );
  await expect(page.locator(".studio-header .brand-depth")).toHaveCount(14);
  await expect(
    page.getByRole("textbox", { name: "Ton texte", exact: true }),
  ).toHaveValue("STUDIO");
  await expect(
    page.getByRole("textbox", { name: "Épaisseur · valeur", exact: true }),
  ).toHaveValue("29");
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("glyphka.design.v1")),
  ).toBe(saved);
  const duration = await page.evaluate(
    () => performance.getEntriesByName("glyphka:intro:duration")[0]?.duration,
  );
  expect(duration).toBeGreaterThan(1800);
  expect(duration).toBeLessThan(3200);
  await page.getByRole("button", { name: "Formes", exact: true }).click();
  await expect(intro).toHaveCount(0);
  await page.reload();
  await expect(intro).toBeVisible();
  await expect(intro).toHaveCount(0, { timeout: 8000 });
  expect(errors).toEqual([]);
});

test("starts with GLYPHKA and retains edited parameters after reloading", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-glyphka-intro",
    "playing",
  );
  await page.keyboard.press("Escape");
  const text = page.getByRole("textbox", { name: "Ton texte", exact: true });
  await expect(text).toHaveValue("GLYPHKA");
  expect(
    await page.evaluate(() => localStorage.getItem("glyphka.design.v1")),
  ).toBeNull();
  await text.fill("HELLO");
  const weight = page.getByRole("textbox", {
    name: "Épaisseur · valeur",
    exact: true,
  });
  await weight.fill("31");
  await weight.press("Enter");
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await page.evaluate(() =>
            localStorage.getItem("glyphka.design.v1"),
          )) || "{}",
        ).weight,
    )
    .toBe(31);
  const saved = await page.evaluate(() =>
    localStorage.getItem("glyphka.design.v1"),
  );
  expect(JSON.parse(saved!)).toEqual({
    ...DEFAULT_DESIGN,
    text: "HELLO",
    weight: 31,
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-glyphka-intro",
    "playing",
  );
  const skip = page.getByRole("button", { name: "Passer", exact: true });
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".startup-intro")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lettrage", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".studio")).not.toHaveAttribute("inert");
  await expect(text).toHaveValue("HELLO");
  await expect(weight).toHaveValue("31");
  expect(
    await page.evaluate(() => localStorage.getItem("glyphka.design.v1")),
  ).toBe(saved);
});

test("fits a small dark viewport and skips when reduced motion is enabled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/", { waitUntil: "commit" });
  const intro = page.locator(".startup-intro");
  await expect(intro).toBeVisible();
  await expect(intro.locator(".startup-veil")).toHaveCSS(
    "background-color",
    "rgb(28, 28, 30)",
  );
  const box = (await intro.locator(".startup-word").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(8);
  expect(box.x + box.width).toBeLessThanOrEqual(312);
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await expect(intro).toHaveCount(0);
  await expect(page.locator(".studio")).not.toHaveAttribute("inert");
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-glyphka-intro");
  await expect(page.locator(".startup-intro")).toBeHidden();
  await expect(page.locator(".studio")).toHaveCSS("opacity", "1");
  const logo = page.locator(".studio-header .brand-word");
  await expect(logo).toHaveCSS("color", "rgb(245, 245, 247)");
  const header = (await logo.boundingBox())!;
  const exporter = (await page.locator(".export-menu").boundingBox())!;
  const presets = await page
    .locator(".top-actions > button")
    .nth(1)
    .boundingBox();
  expect(Math.abs(header.x + header.width / 2 - 160)).toBeLessThan(1);
  expect(header.x + header.width).toBeLessThan(exporter.x);
  if (presets) expect(presets.x + presets.width).toBeLessThan(header.x);
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await expect(logo).toHaveCSS("color", "rgb(29, 29, 31)");
  const a = logo.locator('[data-letter="A"]');
  await expect(a).toHaveAttribute("data-variant", "0");
  await expect(a.locator("[data-intro-ink]").first()).toHaveAttribute(
    "d",
    /M13 16H50L78 84/,
  );
});

test("reveals the prerendered site if the application bundle cannot load", async ({
  page,
}) => {
  await page.route(/\/assets\/index-[^/]+\.js$/, (route) => route.abort());
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator(".startup-intro")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-glyphka-intro", {
    timeout: 6000,
  });
  await expect(page.locator(".startup-intro")).toBeHidden();
  await expect(page.locator("main .lettering")).toBeVisible();
  await expect(page.locator(".studio")).not.toHaveAttribute("inert");
});

test("offers eight additional vector languages that restore from storage", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "commit" });
  const families = page.locator(".families");
  await expect(families.locator("button")).toHaveCount(24);
  const styles = [
    "Double trait",
    "Segments",
    "Encoches",
    "Tressé",
    "Prisme",
    "Nœuds",
    "Trame",
    "Croisé",
  ];
  const drawings = new Set<string>();
  for (const name of styles) {
    const button = families.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    drawings.add(
      await page.locator("main .lettering .glyph-shape").first().innerHTML(),
    );
  }
  expect(drawings.size).toBe(8);
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await page.evaluate(() =>
            localStorage.getItem("glyphka.design.v1"),
          )) || "{}",
        ).family,
    )
    .toBe("crosscut");
  await page.reload();
  await expect(
    families.getByRole("button", { name: "Croisé", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

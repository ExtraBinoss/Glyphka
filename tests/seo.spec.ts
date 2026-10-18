import { expect, test } from "@playwright/test";
import { DEFAULT_DESIGN } from "../src/engine/model";
import { getSiteMeta, SITE_URL } from "../src/site-meta";

test("serves the visible studio and complete metadata without JavaScript", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:8402/");
    await expect(page).toHaveTitle(getSiteMeta("en").title);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", { name: "Glyphka", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "GLYPHKA", exact: true }),
    ).toBeVisible();
    await expect(page.locator("main.workspace")).toHaveCSS("opacity", "1");
    await expect(page.locator(".rail-label").first()).toHaveCSS("opacity", "0");
    expect(
      await page.locator("main .lettering").evaluate((element) => {
        for (
          let node: Element | null = element;
          node;
          node = node.parentElement
        ) {
          const style = getComputedStyle(node);
          if (
            style.opacity === "0" ||
            style.visibility === "hidden" ||
            style.display === "none"
          )
            return false;
        }
        return true;
      }),
    ).toBe(true);
    await page.screenshot({ path: "artifacts/glyphka-no-js.png" });
    await expect(page.locator(".paint-surface").first()).toHaveAttribute(
      "fill",
      "var(--foreground)",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      SITE_URL,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${SITE_URL}social/glyphka.png`,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      getSiteMeta("en").description,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    await expect(
      page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute("content", "1200");
    await expect(
      page.locator('meta[property="og:image:height"]'),
    ).toHaveAttribute("content", "630");
    const schema = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent())!,
    ) as { "@graph": { "@type": string; url: string }[] };
    expect(
      schema["@graph"].some(
        (item) => item["@type"] === "WebApplication" && item.url === SITE_URL,
      ),
    ).toBe(true);
    const image = await request.get("/social/glyphka.png");
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
    const png = await image.body();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    expect(await (await request.get("/robots.txt")).text()).toContain(
      `${SITE_URL}sitemap.xml`,
    );
    expect(await (await request.get("/sitemap.xml")).text()).toContain(
      `<loc>${SITE_URL}</loc>`,
    );
  } finally {
    await context.close();
  }
});

test("hydrates the existing SVG before restoring saved preferences without rewriting the design", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await request.get("/");
  const source = await response.text();
  const modulePath = source.match(
    /<script\b[^>]*type="module"[^>]*src="([^"]+)"/,
  )?.[1];
  expect(modulePath).toBeTruthy();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**${modulePath}`, async (route) => {
    await gate;
    await route.continue();
  });
  const saved = JSON.stringify({
    ...DEFAULT_DESIGN,
    text: "SIGNAL",
    color: "#ff5a1f",
    weight: 29,
  });
  await page.addInitScript((design) => {
    localStorage.setItem("glyphka.design.v1", design);
    localStorage.setItem("glyphka.language", "en");
    localStorage.setItem("glyphka.theme", "dark");
    localStorage.setItem("glyphka.palette", JSON.stringify(["#123abc"]));
  }, saved);
  await page.goto("/", { waitUntil: "commit" });
  const svg = page.getByRole("img", { name: "GLYPHKA", exact: true });
  await expect(svg).toBeAttached();
  const original = await svg.elementHandle();
  expect(original).not.toBeNull();
  await expect(page.locator("html")).toHaveClass(/dark/);
  release();
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(
    page.getByRole("textbox", { name: "Your text", exact: true }),
  ).toHaveValue("SIGNAL");
  expect(
    await original!.evaluate(
      (element) => element === document.querySelector("main .lettering"),
    ),
  ).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("Glyphka — Shape your own language");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("button", { name: "#123abc", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("glyphka.design.v1")),
  ).toBe(saved);
  expect(errors).toEqual([]);
});

test("keeps social previews English while localizing interface metadata and structured descriptions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "À propos", exact: true }).click();
  for (const [language, label] of [
    ["en", "English"],
    ["fr", "Français"],
  ] as const) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const meta = getSiteMeta(language);
    const social = getSiteMeta("en");
    await expect(page).toHaveTitle(meta.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      meta.description,
    );
    for (const selector of [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ])
      await expect(page.locator(selector)).toHaveAttribute(
        "content",
        social.description,
      );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      social.locale,
    );
    for (const selector of [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ])
      await expect(page.locator(selector)).toHaveAttribute(
        "content",
        social.title,
      );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      SITE_URL,
    );
    const graph = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent())!,
    )["@graph"];
    const application = graph.find(
      (entry: { "@type": string }) => entry["@type"] === "WebApplication",
    );
    expect(application.description).toBe(meta.description);
    expect(application.offers.price).toBe("0");
    expect(application.license).toBe(`${SITE_URL}licenses/Glyphka-MIT.txt`);
  }
});

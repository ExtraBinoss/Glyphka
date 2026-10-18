import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { getSiteMeta, SITE_URL, structuredData } from "../src/site-meta";

const entry = pathToFileURL(resolve("artifacts/ssr/entry-server.js")).href;
const { render } = (await import(entry)) as {
  render: () => Promise<string>;
};
const markup = await render();
if (!markup.includes("<svg") || !markup.includes('class="studio '))
  throw new Error("Prerender did not produce the studio and its vector art.");
const template = await readFile("dist/index.html", "utf8");
if (!template.includes('<div id="root"></div>'))
  throw new Error("The root placeholder is missing from the Vite output.");
const jsonLd = JSON.stringify(structuredData).replace(/</g, "\\u003c");
const html = template
  .replace('<div id="root"></div>', () => `<div id="root">${markup}</div>`)
  .replace(
    "</head>",
    `<script type="application/ld+json">${jsonLd}</script></head>`,
  );
const expected = getSiteMeta("en");
if (!html.includes(expected.title) || !html.includes(SITE_URL))
  throw new Error("The public metadata and prerender configuration differ.");
await writeFile("dist/index.html", html);
console.log(
  `Prerendered studio: ${(Buffer.byteLength(markup) / 1024).toFixed(1)} kB HTML.`,
);

# Glyphka identity

The name is **Glyphka**, with a capital **G**. The logo uses the studio's **Stencil** language.

- `glyphka-wordmark.svg`: the complete Stencil wordmark in dark ink.
- `glyphka-wordmark-white.svg`: the same geometry in white.
- `glyphka-lettering.svg`: the complete wordmark in blue.
- `../favicon.svg`: the Stencil G from the same design, sized for browser tabs.

These assets come from `src/lib/brand-design.ts` and the app's SVG engine. There are no font outlines or font dependencies in the logo. The introduction settles into the same Stencil letters as the permanent header.

The sharing composition follows Maskot: a large illustration on the left, the name and short description on the right, borderless samples and the website below. The image shows nine actual letter constructions on the left and a short “Try it!” invitation on the right. The Stencil wordmark appears once, at the top left. The website and globe sit at the bottom right.

Run `bun run assets:social` to generate the SVG assets and capture `artwork/social/index.html` in Chromium at 1200 × 630. All fonts and images are local; the renderer waits for them to decode before capturing.

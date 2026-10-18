export const SITE_URL = "https://glyphka.plinka.eu/";
export const SOCIAL_IMAGE = `${SITE_URL}social/glyphka.png`;

const descriptions = {
  fr: {
    title: "Glyphka — Crée ton langage graphique",
    description:
      "Crée des lettrages géométriques, compose des symboles et explore leurs volumes en 3D. Un atelier génératif gratuit, dans ton navigateur, avec export SVG et PNG.",
    imageAlt:
      "Glyphka : le logo Stencil, neuf lettres colorées, Try it! et le site glyphka.plinka.eu sur fond clair.",
    locale: "fr_FR",
  },
  en: {
    title: "Glyphka — Shape your own language",
    description:
      "Create geometric lettering, compose symbols and explore their forms in 3D. A free generative studio in your browser, with SVG and PNG export.",
    imageAlt:
      "Glyphka: its Stencil wordmark, nine colorful letters, Try it! and glyphka.plinka.eu on a light background.",
    locale: "en_US",
  },
} as const;

export function getSiteMeta(language: string) {
  return descriptions[language.startsWith("fr") ? "fr" : "en"];
}

export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      name: "Glyphka",
      url: SITE_URL,
      inLanguage: ["fr", "en"],
      publisher: { "@id": "https://plinka.eu/#organization" },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}#app`,
      name: "Glyphka",
      url: SITE_URL,
      description: descriptions.en.description,
      applicationCategory: "DesignApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript. WebGL is optional for 3D.",
      isAccessibleForFree: true,
      license: `${SITE_URL}licenses/Glyphka-MIT.txt`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      inLanguage: ["fr", "en"],
      image: SOCIAL_IMAGE,
      featureList: [
        "Generative geometric lettering",
        "Editable vector symbols and shapes",
        "3D extrusion and materials",
        "SVG and PNG export",
        "Local presets",
      ],
      author: { "@id": "https://plinka.eu/#organization" },
      isPartOf: { "@id": `${SITE_URL}#website` },
    },
    {
      "@type": "Organization",
      "@id": "https://plinka.eu/#organization",
      name: "Plinka",
      url: "https://plinka.eu/",
    },
  ],
};

export function getStructuredData(language: string) {
  return {
    ...structuredData,
    "@graph": structuredData["@graph"].map((entry) =>
      entry["@type"] === "WebApplication"
        ? { ...entry, description: getSiteMeta(language).description }
        : entry,
    ),
  };
}

export function updateSiteMeta(language: string) {
  const meta = getSiteMeta(language);
  const social = descriptions.en;
  document.documentElement.lang = language.startsWith("fr") ? "fr" : "en";
  document.title = meta.title;
  const schema = document.querySelector('script[type="application/ld+json"]');
  if (schema) schema.textContent = JSON.stringify(getStructuredData(language));
  const values: [string, string][] = [
    ['meta[name="description"]', meta.description],
    ['meta[property="og:title"]', social.title],
    ['meta[property="og:description"]', social.description],
    ['meta[property="og:locale"]', social.locale],
    ['meta[property="og:locale:alternate"]', "fr_FR"],
    ['meta[property="og:image:alt"]', social.imageAlt],
    ['meta[name="twitter:title"]', social.title],
    ['meta[name="twitter:description"]', social.description],
    ['meta[name="twitter:image:alt"]', social.imageAlt],
  ];
  for (const [selector, content] of values)
    document.querySelector(selector)?.setAttribute("content", content);
}

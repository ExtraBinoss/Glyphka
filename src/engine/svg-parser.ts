import { DOMParser as XmlParser } from "@xmldom/xmldom";

// SVGLoader only needs XML nodes and gradient lookup for our generated paths.
// Supply that parser in workers; no DOM, layout or browser rendering is involved.
export function installVectorParser() {
  if (typeof globalThis.DOMParser !== "undefined") return;
  const Parser = class {
    parseFromString(source: string) {
      const doc = new XmlParser().parseFromString(source, "image/svg+xml");
      Object.defineProperty(doc, "querySelectorAll", {
        value: (selector: string) =>
          selector
            .split(",")
            .flatMap((name) =>
              Array.from(doc.getElementsByTagName(name.trim())),
            ),
      });
      return doc;
    }
  };
  globalThis.DOMParser = Parser as unknown as typeof DOMParser;
}

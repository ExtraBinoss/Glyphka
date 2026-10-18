import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { ScrollShadow } from "./ScrollShadow";
import s from "@/styles/credits.module.css";

const methods = [
  {
    title: "Geometric lettering",
    description:
      "Letters are assembled from capsules, circles, arcs and cutouts. Seeded generation varies their proportions, curves and alternate constructions reproducibly.",
  },
  {
    title: "Procedural shapes",
    description:
      "Polygons, stars, petals, waves and organic contours are generated from editable parameters. The superformula family is based on Johan Gielis’s 2003 mathematical model.",
    reference: {
      name: "Gielis · American Journal of Botany, 2003",
      href: "https://doi.org/10.3732/ajb.90.3.333",
    },
  },
  {
    title: "SVG morphing",
    description:
      "Vector paths are normalized with svgpath and interpolated with d3-interpolate-path. Motion coordinates interface transitions and frame updates.",
  },
  {
    title: "Contours & 3D",
    description:
      "Clipper combines contours and subtracts holes. Three.js extrudes them into meshes with bevels, materials and lighting. Geometry is built in a worker and reusable results are cached.",
  },
  {
    title: "Color & light",
    description:
      "Amplo and ReUI provide the gradient and color controls, with color conversions by Culori. The baked studio lighting is generated from Three.js RoomEnvironment.",
  },
];
const credits = [
  {
    name: "Three.js",
    href: "https://github.com/mrdoob/three.js",
    license: "MIT",
    file: "Three-LICENSE.txt",
    role: "3D rendering, extrusion and environment lighting.",
  },
  {
    name: "JavaScript Clipper",
    href: "https://github.com/junmer/clipper-lib",
    license: "BSL-1.0",
    file: "Clipper-LICENSE.txt",
    role: "Polygon unions, differences and contour offsets. Boost Software License 1.0.",
  },
  {
    name: "d3-interpolate-path",
    href: "https://github.com/pbeshai/d3-interpolate-path",
    license: "BSD-3-Clause",
    file: "d3-interpolate-path-LICENSE.txt",
    role: "Interpolation between SVG paths.",
  },
  {
    name: "svgpath",
    href: "https://github.com/fontello/svgpath",
    license: "MIT",
    file: "svgpath-LICENSE.txt",
    role: "SVG path normalization and transformations.",
  },
  {
    name: "Amplo",
    href: "https://github.com/TheAleSch/amplo-picker",
    license: "MIT",
    file: "amplo.txt",
    role: "Gradient controls by Alexandre Schrammel.",
  },
  {
    name: "ReUI",
    href: "https://reui.io/components/color-picker",
    license: "MIT",
    file: "ReUI-LICENSE.txt",
    role: "Color picker by Keenthemes.",
  },
  {
    name: "Culori",
    href: "https://github.com/Evercoder/culori",
    license: "MIT",
    file: "Culori-LICENSE.txt",
    role: "Color space conversions.",
  },
  {
    name: "shadcn/ui",
    href: "https://ui.shadcn.com/",
    license: "MIT",
    file: "shadcn-LICENSE.txt",
    role: "Interface components built on Base UI.",
  },
  {
    name: "Space Grotesk",
    href: "https://github.com/floriankarsten/space-grotesk",
    license: "OFL-1.1",
    file: "Space-Grotesk-OFL.txt",
    role: "Heading typeface by Florian Karsten and the project contributors.",
  },
  {
    name: "Source Sans 3",
    href: "https://github.com/adobe-fonts/source-sans",
    license: "OFL-1.1",
    file: "Source-Sans-3-OFL.txt",
    role: "Interface typeface by Adobe and the project contributors.",
  },
  {
    name: "Lucide",
    href: "https://lucide.dev/",
    license: "ISC",
    file: "Lucide-ISC.txt",
    role: "Interface icons.",
  },
  {
    name: "Octicons",
    href: "https://github.com/primer/octicons",
    license: "MIT",
    file: "Octicons-MIT.txt",
    role: "GitHub’s mark in About.",
  },
  {
    name: "Class Variance Authority",
    href: "https://github.com/joe-bell/cva",
    license: "Apache-2.0",
    file: "CVA-Apache-2.0.txt",
    role: "Component variants.",
  },
];
const tools = [
  { name: "React", href: "https://react.dev/" },
  { name: "Base UI", href: "https://base-ui.com/" },
  { name: "Motion", href: "https://motion.dev/" },
  { name: "Jotai", href: "https://jotai.org/" },
  { name: "Tailwind CSS", href: "https://tailwindcss.com/" },
];

export function CreditsDialog({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger className={triggerClassName} lang="en">
        Credits &amp; licenses
      </DialogTrigger>
      <DialogContent className={s.dialog} lang="en">
        <DialogHeader className={s.header}>
          <DialogTitle className={s.title}>Credits &amp; licenses</DialogTitle>
          <DialogDescription>
            The ideas, methods and open-source tools behind Glyphka.
          </DialogDescription>
        </DialogHeader>
        <ScrollShadow className={s.body} label="Credits">
          <section className={s.section} aria-labelledby="credits-inspiration">
            <h3 id="credits-inspiration">Inspiration</h3>
            <p>
              <a
                href="https://www.monotype.com/resources/special-aphex-twin-logo"
                target="_blank"
                rel="noreferrer"
              >
                Paul Nicholson’s geometric identity for Aphex Twin
              </a>{" "}
              inspired the approach to abstract lettering. Glyphka’s alphabet is
              generated from its own vector primitives.
            </p>
          </section>
          <section className={s.section} aria-labelledby="credits-methods">
            <h3 id="credits-methods">How it works</h3>
            <ul className={s.credits}>
              {methods.map((method) => (
                <li key={method.title}>
                  <h4>{method.title}</h4>
                  <p>{method.description}</p>
                  {method.reference && (
                    <a
                      className={s.reference}
                      href={method.reference.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {method.reference.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className={s.section} aria-labelledby="credits-open-source">
            <h3 id="credits-open-source">Open source</h3>
            <p>
              Glyphka’s original source code is MIT licensed. Third-party code,
              fonts and assets retain their respective licenses.
            </p>
            <ul className={s.credits}>
              {credits.map((credit) => (
                <li key={credit.name}>
                  <div className={s.heading}>
                    <h4>
                      <a href={credit.href} target="_blank" rel="noreferrer">
                        {credit.name}
                      </a>
                    </h4>
                    <a
                      className={s.license}
                      href={`/licenses/${credit.file}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${credit.name} ${credit.license} license`}
                    >
                      {credit.license}
                    </a>
                  </div>
                  <p>{credit.role}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className={s.tools} aria-label="Built with">
            <h3>Built with</h3>
            <ul>
              {tools.map((tool) => (
                <li key={tool.name}>
                  <a href={tool.href} target="_blank" rel="noreferrer">
                    {tool.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </ScrollShadow>
        <DialogFooter className={s.footer}>
          <a href="/licenses/Glyphka-MIT.txt" target="_blank" rel="noreferrer">
            Glyphka · MIT
          </a>
          <a
            href="https://github.com/ExtraBinoss/Glyphka"
            target="_blank"
            rel="noreferrer"
          >
            Source code
          </a>
          <a href="/licenses/NOTICE.txt" target="_blank" rel="noreferrer">
            Full notices
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

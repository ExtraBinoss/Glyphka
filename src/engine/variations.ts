import { FAMILIES, type Design } from "./model";
import { random } from "./geometry";
import { randomizeDesign } from "./randomize";

export function generateVariations(design: Design, seed: number): Design[] {
  const rng = random(seed),
    families = [...FAMILIES];
  for (let i = families.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [families[i], families[j]] = [families[j], families[i]];
  }
  return families.slice(0, 4).map((family, index) => {
    const variant = randomizeDesign(design, (seed + index * 43) % 999999);
    return {
      ...variant,
      family,
      render: {
        ...variant.render,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        autoRotate: false,
      },
    };
  });
}

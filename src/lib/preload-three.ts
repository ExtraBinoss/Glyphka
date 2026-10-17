import { getDefaultStore } from "jotai";
import {
  designAtom,
  modeAtom,
  selectedGlyphAtom,
  threeMountedAtom,
} from "@/state/studio";
import { buildMesh } from "@/engine/mesh-service";

let pending: Promise<typeof import("../components/ThreeView")> | undefined;
export function loadThree() {
  pending ??= Promise.all([
    import("../components/ThreeView"),
    import("./environment").then((module) => module.loadEnvironment()),
  ])
    .then(([module]) => module)
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
export function preloadThree() {
  const store = getDefaultStore(),
    mode = store.get(modeAtom);
  void loadThree()
    .then(() => {
      if (store.get(modeAtom) !== "about") store.set(threeMountedAtom, true);
    })
    .catch(() => {
      /* A later explicit activation can retry. */
    });
  if (mode !== "about")
    void buildMesh(
      store.get(designAtom),
      mode,
      store.get(selectedGlyphAtom),
      false,
    ).catch(() => {
      /* Optional prewarm; explicit activation reports errors. */
    });
}

import { atom } from "jotai";
import type { Design } from "@/engine/model";
import { generateVariations } from "@/engine/variations";
import { designAtom } from "./studio";

export const directionsAtom = atom<Design[]>([]);
export const refreshDirectionsAtom = atom(null, (get, set) => {
  set(
    directionsAtom,
    generateVariations(get(designAtom), Math.floor(Math.random() * 999999)),
  );
});

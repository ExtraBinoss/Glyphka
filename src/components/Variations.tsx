import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import {
  designAtom,
  editAtom,
  modeAtom,
  selectedGlyphAtom,
} from "@/state/studio";
import { FAMILIES, PRESETS, type Design } from "@/engine/model";
import { random } from "@/engine/geometry";
import { Lettering } from "./Drawing";
import { Button } from "./ui/button";

export function generateVariations(design: Design, seed: number): Design[] {
  const rng = random(seed),
    families = [...FAMILIES];
  for (let i = families.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [families[i], families[j]] = [families[j], families[i]];
  }
  return families.slice(0, 4).map((family, index) => ({
    ...design,
    ...PRESETS[family],
    seed: seed + index * 43,
    weight: Math.round(16 + rng() * 14),
    slant: Math.round(-18 + rng() * 24),
    width: Math.round(78 + rng() * 45),
    tracking: Math.round(4 + rng() * 22),
    cutouts: Math.round(rng() * 85),
    mutation: Math.round(rng() * 65),
    alternates: Object.fromEntries(
      [...design.text].map((_, i) => [i, Math.floor(rng() * 200000)]),
    ),
  }));
}
export function Variations() {
  const { t } = useTranslation(),
    design = useAtomValue(designAtom),
    edit = useSetAtom(editAtom),
    mode = useAtomValue(modeAtom),
    selected = useAtomValue(selectedGlyphAtom);
  const [seed, setSeed] = useState(3701),
    [expanded, setExpanded] = useState(true);
  const variations = generateVariations(design, seed);
  return (
    <section
      className={`variations ${expanded ? "" : "collapsed"}`}
      aria-label={t("variants")}
    >
      <div className="variation-heading">
        <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {t("exploreTitle")}
          <span>{expanded ? "−" : "+"}</span>
        </button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t("newVariants")}
          title={t("newVariants")}
          onClick={() => {
            setSeed(Math.floor(Math.random() * 999999));
            setExpanded(true);
          }}
        >
          <RefreshCw />
        </Button>
      </div>
      {expanded && (
        <div className="variation-grid">
          {variations.map((v, i) => (
            <button
              key={i}
              className="variation-card"
              aria-label={`${t("apply")} ${t(v.family)} ${i + 1}`}
              onClick={() => edit(v)}
            >
              <span className="variation-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Lettering
                design={v}
                singleIndex={
                  mode === "symbol"
                    ? Math.min(selected, Math.max(0, v.text.length - 1))
                    : undefined
                }
              />
              <span className="variation-label">{t(v.family)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

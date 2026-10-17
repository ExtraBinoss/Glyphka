import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { AnimatePresence, m } from "motion/react";
import { ChevronDown, RefreshCw } from "lucide-react";
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
    [expanded, setExpanded] = useState(false);
  const variations = generateVariations(design, seed);
  return (
    <section
      className={`variations ${expanded ? "" : "collapsed"}`}
      aria-label={t("variants")}
    >
      <div className="variation-heading">
        <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {t("exploreTitle")}
          <m.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.24 }}
          >
            <ChevronDown size={14} />
          </m.span>
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
      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            className="variation-reveal"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 0.7, 0.2, 1] }}
          >
            <m.div
              className="variation-grid"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: { transition: { staggerChildren: 0.035 } },
                closed: {},
              }}
            >
              {variations.map((v, i) => (
                <m.button
                  variants={{
                    closed: { opacity: 0, y: 12, scale: 0.97 },
                    open: { opacity: 1, y: 0, scale: 1 },
                  }}
                  transition={{ duration: 0.25 }}
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
                </m.button>
              ))}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}

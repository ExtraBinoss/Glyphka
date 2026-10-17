import { useEffect, useMemo, useState } from "react";
import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { AnimatePresence, m } from "motion/react";
import { ChevronDown, RefreshCw } from "lucide-react";
import {
  designAtom,
  textAtom,
  editAtom,
  modeAtom,
  selectedGlyphAtom,
  previewDesignAtom,
  viewAtom,
} from "@/state/studio";
import type { Design } from "@/engine/model";
import { generateVariations } from "@/engine/variations";
import { buildMesh } from "@/engine/mesh-service";
import { Lettering } from "./Drawing";
import { Button } from "./ui/button";

export function Variations() {
  const { t } = useTranslation(),
    text = useAtomValue(textAtom),
    edit = useSetAtom(editAtom),
    mode = useAtomValue(modeAtom),
    selected = useAtomValue(selectedGlyphAtom),
    view = useAtomValue(viewAtom),
    preview = useSetAtom(previewDesignAtom);
  const [candidates, setVariations] = useState<Design[]>([]),
    [expanded, setExpanded] = useState(false);
  const variations = useMemo(
    () => candidates.map((v) => ({ ...v, text })),
    [candidates, text],
  );
  const refresh = () =>
    setVariations(
      generateVariations(
        getDefaultStore().get(designAtom),
        Math.floor(Math.random() * 999999),
      ),
    );
  useEffect(() => () => preview(null), [preview]);
  useEffect(() => {
    if (expanded && view === "3d" && mode !== "about")
      for (const v of variations)
        void buildMesh(v, mode, selected, false).catch(() => {
          /* Optional preview prewarm. */
        });
  }, [expanded, view, mode, variations, selected]);
  return (
    <section
      className={`variations ${expanded ? "expanded" : "collapsed"}`}
      aria-label={t("variants")}
    >
      <div className="variation-heading">
        <button
          onClick={() => {
            preview(null);
            if (!expanded) refresh();
            setExpanded(!expanded);
          }}
          aria-expanded={expanded}
        >
          {t("exploreTitle")}
          <m.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.24 }}
          >
            <ChevronDown size={14} />
          </m.span>
        </button>
        {expanded && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("newVariants")}
            onClick={() => {
              preview(null);
              refresh();
            }}
          >
            <RefreshCw />
          </Button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            className="variation-reveal"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
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
                  key={`${v.family}-${v.seed}`}
                  className="variation-card"
                  aria-label={`${t("apply")} ${t(v.family)} ${i + 1}`}
                  variants={{
                    closed: { opacity: 0, y: 12 },
                    open: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.22 }}
                  onPointerEnter={() => preview(v)}
                  onPointerLeave={() => preview(null)}
                  onFocus={() => preview(v)}
                  onBlur={() => preview(null)}
                  onClick={() => {
                    edit(v);
                    preview(null);
                  }}
                >
                  <span className="variation-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Lettering
                    design={v}
                    paint={v}
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

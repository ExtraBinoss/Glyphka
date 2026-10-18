import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { AnimatePresence, m, useIsPresent } from "motion/react";
import { ChevronUp, Dice5 } from "lucide-react";
import {
  editAtom,
  textAtom,
  modeAtom,
  selectedGlyphAtom,
  previewDesignAtom,
  viewAtom,
} from "@/state/studio";
import { directionsAtom, refreshDirectionsAtom } from "@/state/directions";
import { buildMesh } from "@/engine/mesh-service";
import { Lettering } from "./Drawing";
import { ScrollShadow } from "./ScrollShadow";
import { Button } from "./ui/button";

function DirectionTray({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <m.div
      className="variation-reveal"
      inert={!present}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
    >
      {children}
    </m.div>
  );
}

export function Variations() {
  const { t } = useTranslation(),
    candidates = useAtomValue(directionsAtom),
    text = useAtomValue(textAtom),
    refresh = useSetAtom(refreshDirectionsAtom),
    edit = useSetAtom(editAtom),
    mode = useAtomValue(modeAtom),
    selected = useAtomValue(selectedGlyphAtom),
    view = useAtomValue(viewAtom),
    preview = useSetAtom(previewDesignAtom);
  const [expanded, setExpanded] = useState(false),
    [roll, setRoll] = useState(0);
  const host = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const variations = useMemo(
    () => candidates.map((design) => ({ ...design, text })),
    [candidates, text],
  );
  const hold = () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  useEffect(
    () => () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
      active.current = false;
      preview(null);
    },
    [preview],
  );
  const handleOpen = () => {
    hold();
    active.current = true;
    preview(null);
    if (expanded) return;
    refresh();
    setExpanded(true);
  };
  const close = () => {
    hold();
    active.current = false;
    setExpanded(false);
    preview(null);
  };
  const scheduleClose = () => {
    if (!expanded || closeTimer.current !== null) return;
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      active.current = false;
      setExpanded(false);
      preview(null);
    }, 110);
  };
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !host.current?.contains(event.target)
      ) {
        setExpanded(false);
        active.current = false;
        preview(null);
      }
    };
    window.addEventListener("pointerdown", outside, true);
    return () => window.removeEventListener("pointerdown", outside, true);
  }, [expanded, preview]);
  useEffect(() => {
    if (expanded && view === "3d" && mode !== "about")
      for (const v of variations)
        void buildMesh(v, mode, selected, false).catch(() => {
          /* Optional preview prewarm. */
        });
  }, [expanded, view, mode, variations, selected]);
  return (
    <section
      ref={host}
      className={`variations ${expanded ? "expanded" : "collapsed"}`}
      aria-label={t("variants")}
      onPointerLeave={() => {
        preview(null);
        scheduleClose();
      }}
      onPointerMove={(event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (
          target?.closest(
            ".variation-card, .variation-scroll, .variation-bridge",
          )
        )
          hold();
        else {
          preview(null);
          if (target?.closest(".variation-heading > button")) hold();
          else scheduleClose();
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <div className="variation-heading">
        <button
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") handleOpen();
          }}
          onFocus={handleOpen}
          onClick={handleOpen}
          aria-expanded={expanded}
        >
          {t("exploreTitle")}
          <m.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.24 }}
          >
            <ChevronUp size={14} />
          </m.span>
        </button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t("newVariants")}
          className="variation-refresh"
          aria-hidden={!expanded}
          tabIndex={expanded ? 0 : -1}
          onPointerEnter={() => {
            hold();
            preview(null);
          }}
          onClick={() => {
            preview(null);
            setRoll(roll + 1);
            refresh();
          }}
        >
          <m.span
            animate={{ rotate: roll * 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <Dice5 />
          </m.span>
        </Button>
      </div>
      {expanded && (
        <span
          className="variation-bridge"
          aria-hidden="true"
          onPointerEnter={hold}
        />
      )}
      <AnimatePresence initial={false}>
        {expanded && (
          <DirectionTray>
            <ScrollShadow
              axis="horizontal"
              className="variation-scroll"
              label={t("variants")}
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
                    onPointerEnter={() => {
                      hold();
                      if (active.current) preview(v);
                    }}
                    onFocus={(event) => {
                      if (
                        active.current &&
                        event.currentTarget.matches(":focus-visible")
                      )
                        preview(v);
                    }}
                    onBlur={() => preview(null)}
                    onClick={() => {
                      if (!active.current) return;
                      edit(v);
                      preview(null);
                    }}
                  >
                    <span className="variation-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Lettering
                      morph={false}
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
            </ScrollShadow>
          </DirectionTray>
        )}
      </AnimatePresence>
    </section>
  );
}

import { m } from "motion/react";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { DEFAULT_DESIGN } from "@/engine/model";
import { designAtom, selectedGlyphAtom } from "@/state/studio";
import { Lettering } from "./Drawing";
import { CreditsDialog } from "./CreditsDialog";
import { Preferences } from "./Preferences";
import s from "@/styles/about.module.css";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function About() {
  const { t } = useTranslation(),
    design = useAtomValue(designAtom),
    selected = useAtomValue(selectedGlyphAtom);
  return (
    <m.section
      id="about"
      className={s.about}
      aria-label={t("about")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className={s.content}>
        <h2>Glyphka</h2>
        <section className={s.preferences} aria-label={t("preferences")}>
          <Preferences />
        </section>
        <footer className={s.footer}>
          <div className={s.links}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href="https://github.com/ExtraBinoss/Glyphka"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub"
                  />
                }
              >
                <img
                  className={s.github}
                  src="/github.svg"
                  alt=""
                  width="22"
                  height="22"
                />
              </TooltipTrigger>
              <TooltipContent>GitHub</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href="https://plinka.eu"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Plinka"
                  />
                }
              >
                <img
                  className={s.plinka}
                  src="/plinka.svg"
                  alt=""
                  width="38"
                  height="24"
                  decoding="async"
                />
              </TooltipTrigger>
              <TooltipContent>Plinka</TooltipContent>
            </Tooltip>
          </div>
          <CreditsDialog triggerClassName={s.credits} />
        </footer>
      </div>
      <m.div
        className={s.art}
        aria-hidden="true"
        initial={{ x: 70, opacity: 0, rotate: -8 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 23 }}
      >
        <Lettering
          design={{ ...DEFAULT_DESIGN, ...design, text: design.text || "P" }}
          singleIndex={Math.min(selected, Math.max(0, design.text.length - 1))}
          ink="var(--primary)"
        />
      </m.div>
      <a
        className={s.wordmark}
        href="https://plinka.eu"
        target="_blank"
        rel="noreferrer"
        aria-label="Glyphka · Plinka"
      >
        Glyphka.
      </a>
    </m.section>
  );
}

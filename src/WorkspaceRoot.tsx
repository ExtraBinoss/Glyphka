import { StrictMode, useEffect } from "react";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import { StartupIntro } from "./components/StartupIntro";
import { App } from "./App";
import { restoreLanguage } from "./i18n";
import { restoreDesignFromStorage } from "./state/studio";
import { restorePresetsFromStorage } from "./state/presets";
import { restorePaletteFromStorage } from "./state/palette";
import { TooltipProvider } from "./components/ui/tooltip";

function BrowserPreferences() {
  useEffect(() => {
    restoreDesignFromStorage();
    restorePresetsFromStorage();
    restorePaletteFromStorage();
    restoreLanguage();
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return null;
}

export function WorkspaceRoot() {
  return (
    <StrictMode>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delay={350}>
            <App />
            <StartupIntro />
            <BrowserPreferences />
          </TooltipProvider>
        </MotionConfig>
      </LazyMotion>
    </StrictMode>
  );
}

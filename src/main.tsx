import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import "./i18n";
import "./styles/global.css";
import "./styles/studio.css";
import { App } from "./App";
import { TooltipProvider } from "./components/ui/tooltip";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delay={350}>
          <App />
        </TooltipProvider>
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
);

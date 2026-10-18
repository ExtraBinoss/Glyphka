import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { startIntro } from "@/lib/startup-intro";
import { BrandWord } from "./BrandWord";
import { Button } from "./ui/button";

const noSubscribe = () => () => {};
const introRequested = () =>
  document.documentElement.hasAttribute("data-glyphka-intro");

export function StartupIntro() {
  const { t } = useTranslation();
  const requested = useSyncExternalStore(
    noSubscribe,
    introRequested,
    () => false,
  );
  const [finished, setFinished] = useState(false);
  const host = useRef<HTMLElement>(null);
  const skip = useRef<() => void>(() => {});
  useEffect(() => {
    if (!requested || finished) return;
    const controller = startIntro(
      host.current!,
      document.querySelector<HTMLElement>(".studio")!,
      () => setFinished(true),
    );
    skip.current = controller.skip;
    return () => {
      controller.dispose();
      skip.current = () => {};
    };
  }, [requested, finished]);
  if (finished) return null;
  return (
    <section ref={host} className="startup-intro" aria-label={t("introLabel")}>
      <div className="startup-veil" />
      <div className="startup-lockup" aria-hidden="true">
        <BrandWord animated />
      </div>
      <Button
        className="startup-skip"
        variant="ghost"
        size="sm"
        onClick={() => skip.current()}
      >
        {t("skipIntro")}
        <ArrowRight aria-hidden="true" />
      </Button>
    </section>
  );
}

import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun } from "lucide-react";
import { PreferenceGroup } from "./PreferenceGroup";
import { applyTheme, themeAtom } from "@/state/theme";

export function Preferences() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useAtom(themeAtom);
  function changeTheme(value: string) {
    const apply = () => {
      setTheme(value);
      applyTheme(value);
      try {
        localStorage.setItem("glyphka.theme", value);
      } catch {
        /* Optional persistence. */
      }
    };
    if (
      document.startViewTransition &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      document.startViewTransition(apply);
    else apply();
  }
  return (
    <div className="about-preferences">
      <div>
        <h3>{t("language")}</h3>
        <PreferenceGroup
          label={t("language")}
          value={i18n.resolvedLanguage ?? "en"}
          options={[
            { value: "en", label: "English", lang: "en" },
            { value: "fr", label: "Français", lang: "fr" },
          ]}
          onChange={(value) => void i18n.changeLanguage(value)}
        />
      </div>
      <div>
        <h3>{t("theme")}</h3>
        <PreferenceGroup
          label={t("theme")}
          value={theme}
          options={[
            { value: "system", label: t("system"), Icon: Monitor },
            { value: "light", label: t("light"), Icon: Sun },
            { value: "dark", label: t("dark"), Icon: Moon },
          ]}
          onChange={changeTheme}
        />
      </div>
    </div>
  );
}

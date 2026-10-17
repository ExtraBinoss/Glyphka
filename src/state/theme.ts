import { atom, useAtomValue } from "jotai";
import { useEffect } from "react";
function initialTheme() {
  try {
    return localStorage.getItem("glyphka.theme") || "system";
  } catch {
    return "system";
  }
}
export const themeAtom = atom(initialTheme());
export function applyTheme(theme: string) {
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#1c1c1e" : "#fbfbfd");
}
export function useThemeSync() {
  const theme = useAtomValue(themeAtom);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)"),
      apply = () => applyTheme(theme);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

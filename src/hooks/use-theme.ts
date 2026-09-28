import { useEffect } from "react";

import { useSettings } from "./use-settings";

export function useThemeSync(): void {
  const [{ theme }] = useSettings();
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (): void => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

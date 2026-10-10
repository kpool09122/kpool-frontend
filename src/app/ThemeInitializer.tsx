"use client";

import { useEffect } from "react";
import { applyThemeMode, readThemeMode, themeStorageKey } from "./themeMode";

export function ThemeInitializer() {
  useEffect(() => {
    // The head bootstrap has already restored the theme before first paint.
    if (!document.documentElement.dataset.theme) applyThemeMode(readThemeMode());
    const onStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null) {
        delete document.documentElement.dataset.themePersistence;
        applyThemeMode(readThemeMode());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}

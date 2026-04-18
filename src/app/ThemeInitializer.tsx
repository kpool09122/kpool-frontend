"use client";

import { useEffect } from "react";

import { themeStorageKey, type ThemeMode } from "./themeMode";

function getSystemTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readTheme(): ThemeMode {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return storedTheme === "dark" || storedTheme === "light" ? storedTheme : getSystemTheme();
}

function syncThemeLabel(theme: ThemeMode) {
  document.querySelectorAll("[data-theme-label]").forEach((element) => {
    element.textContent = theme === "dark" ? "Dark" : "Light";
  });
}

function applyTheme(theme: ThemeMode, persist: boolean) {
  document.documentElement.dataset.theme = theme;
  syncThemeLabel(theme);
  if (persist) {
    window.localStorage.setItem(themeStorageKey, theme);
  }
}

export function ThemeInitializer() {
  useEffect(() => {
    applyTheme(readTheme(), false);

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest("[data-theme-toggle]");
      if (!button) {
        return;
      }

      const currentTheme =
        document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, true);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}

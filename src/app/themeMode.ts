import { readThemeStorage, writeThemeStorage } from "@/gateways/theme/themeStorage";

export const themeStorageKey = "kpool-theme";
export type ThemeMode = "light" | "dark";
const themeChangeEvent = "kpool-theme-change";

export function resolveNextThemeMode(currentThemeMode: ThemeMode): ThemeMode {
  return currentThemeMode === "light" ? "dark" : "light";
}

export function resolveThemeMode(stored: string | null, systemDark: boolean): ThemeMode {
  return stored === "light" || stored === "dark" ? stored : systemDark ? "dark" : "light";
}

export function readThemeMode(): ThemeMode {
  return resolveThemeMode(readThemeStorage(themeStorageKey), window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function applyThemeMode(theme: ThemeMode, persist = false) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    document.documentElement.dataset.themePersistence = writeThemeStorage(themeStorageKey, theme) ? "saved" : "unavailable";
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function subscribeThemeMode(onChange: () => void) {
  window.addEventListener(themeChangeEvent, onChange);
  return () => window.removeEventListener(themeChangeEvent, onChange);
}

export function getThemeSnapshot() {
  return `${document.documentElement.dataset.theme ?? "light"}:${document.documentElement.dataset.themePersistence ?? ""}`;
}
export const getServerThemeSnapshot = () => "light:";

// Static, non-user-controlled script runs in head before content is painted.
// Keep the storage key and priority identical to readThemeMode.
export const themeBootstrapScript = `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(themeStorageKey)})}catch(e){}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()`;

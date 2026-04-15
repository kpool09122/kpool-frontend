export const themeStorageKey = "kpool-theme";

export type ThemeMode = "light" | "dark";

export function resolveNextThemeMode(currentThemeMode: ThemeMode): ThemeMode {
  return currentThemeMode === "light" ? "dark" : "light";
}

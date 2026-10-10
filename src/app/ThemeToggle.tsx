"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "../i18n/I18nProvider";
import {
  applyThemeMode,
  getServerThemeSnapshot,
  getThemeSnapshot,
  resolveNextThemeMode,
  subscribeThemeMode,
} from "./themeMode";

export function ThemeToggle() {
  const { dictionary } = useI18n();
  const t = dictionary.header;
  const snapshot = useSyncExternalStore(
    subscribeThemeMode,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const mode = snapshot.startsWith("dark:") ? "dark" : "light";
  return (
    <div className="grid gap-1 py-2">
      <button
        type="button"
        aria-label={t.themeMode}
        aria-pressed={mode === "dark"}
        title={t.themeDeviceHint}
        onClick={() => applyThemeMode(resolveNextThemeMode(mode), true)}
        className="min-h-10 rounded-full border border-stroke-subtle bg-surface-base px-3 py-2 text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        {mode === "dark" ? t.themeDark : t.themeLight}
      </button>
      <span className="text-xs text-text-muted">{t.themeDeviceHint}</span>
      {snapshot.endsWith(":unavailable") ? (
        <span role="status" className="text-xs text-status-warning">{t.themeSaveFailed}</span>
      ) : null}
    </div>
  );
}

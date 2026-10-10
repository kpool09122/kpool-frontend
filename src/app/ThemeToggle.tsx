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

export function ThemeToggle({ variant = "toggle" }: { variant?: "toggle" | "choices" }) {
  const { dictionary } = useI18n();
  const t = dictionary.header;
  const snapshot = useSyncExternalStore(
    subscribeThemeMode,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const mode = snapshot.startsWith("dark:") ? "dark" : "light";
  return (
    <div className="grid gap-1">
      {variant === "choices" ? (
        <fieldset>
          <legend className="sr-only">{t.themeMode}</legend>
          <div className="grid divide-y divide-stroke-subtle">
            {(["light", "dark"] as const).map((choice) => (
              <label key={choice} className="flex min-h-11 cursor-pointer items-center justify-between px-1 py-3 text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/20 focus-within:bg-brand-highlight/20">
                <span>{choice === "light" ? t.themeLight : t.themeDark}</span>
                <input
                  type="radio"
                  name="theme-mode"
                  value={choice}
                  checked={mode === choice}
                  onChange={() => applyThemeMode(choice, true)}
                  className="size-4 accent-brand-primary"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <button
          type="button"
          role="switch"
          aria-label={t.themeMode}
          aria-checked={mode === "dark"}
          onClick={() => applyThemeMode(resolveNextThemeMode(mode), true)}
          className="inline-flex min-h-10 items-center gap-2 rounded text-sm font-semibold text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors ${mode === "dark" ? "bg-brand-primary" : "bg-stroke-subtle"}`}>
            <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${mode === "dark" ? "translate-x-4" : "translate-x-0"}`} />
          </span>
          <span aria-hidden="true" className="min-w-[3em] text-left">{mode === "dark" ? t.themeDark : t.themeLight}</span>
        </button>
      )}
      {snapshot.endsWith(":unavailable") ? (
        <span role="status" className="text-xs text-status-warning">{t.themeSaveFailed}</span>
      ) : null}
    </div>
  );
}

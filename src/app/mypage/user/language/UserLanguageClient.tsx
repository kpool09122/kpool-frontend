"use client";

import { localeLabels } from "../../../../i18n/locales";
import { useUserSection } from "../UserSectionContext";

export function UserLanguageClient() {
  const {
    currentIdentity,
    settingsState,
    t,
    onSave,
    onUpdateField,
  } = useUserSection();

  return (
    <section className="mt-5 rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t.languageSettingsTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">{t.languageSettingsDescription}</p>
        </div>
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={settingsState.isSaving || !currentIdentity}
          onClick={onSave}
          type="button"
        >
          {settingsState.isSaving ? t.identitySettingsSaving : t.identitySettingsSave}
        </button>
      </div>
      <div className="mt-5 grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">
          {t.languageLabel}
          <select
            className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
            disabled={settingsState.isSaving || !currentIdentity}
            onChange={(event) => onUpdateField("language", event.currentTarget.value)}
            value={settingsState.language}
          >
            {Object.entries(localeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {settingsState.error ? (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
            {settingsState.error}
          </p>
        ) : null}
        {settingsState.syncError ? (
          <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800" role="alert">
            {settingsState.syncError}
          </p>
        ) : null}
        {settingsState.success ? (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">
            {settingsState.success}
          </p>
        ) : null}
      </div>
    </section>
  );
}

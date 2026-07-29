"use client";

import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
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
    <UserSettingsPanel
      action={
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={settingsState.isSaving || !currentIdentity}
          onClick={onSave}
          type="button"
        >
          {settingsState.isSaving ? t.identitySettingsSaving : t.identitySettingsSave}
        </button>
      }
      description={t.languageSettingsDescription}
      title={t.languageSettingsTitle}
    >
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
          <UserStatusMessage variant="error">
            {settingsState.error}
          </UserStatusMessage>
        ) : null}
        {settingsState.syncError ? (
          <UserStatusMessage variant="warning">
            {settingsState.syncError}
          </UserStatusMessage>
        ) : null}
        {settingsState.success ? (
          <UserStatusMessage variant="success">
            {settingsState.success}
          </UserStatusMessage>
        ) : null}
      </div>
    </UserSettingsPanel>
  );
}

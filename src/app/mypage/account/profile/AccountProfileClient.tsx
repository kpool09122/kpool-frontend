"use client";

import { useAccountSection } from "../AccountSectionContext";
import { useAccountProfile } from "./useAccountProfile";

export function AccountProfileClient() {
  const {
    accountIdentifier,
    canEdit,
    t,
  } = useAccountSection();
  const {
    state,
    loadAccount,
    saveAccount,
    updateAccountName,
  } = useAccountProfile({
    accountIdentifier,
    canEdit,
    t,
  });
  const isBusy = state.isLoading || state.isSaving;

  return (
    <section className="mt-5 rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-xl font-semibold">{t.accountInformationTitle}</h2>
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isBusy || !canEdit || !state.account}
          onClick={saveAccount}
          type="button"
        >
          {state.isSaving ? t.accountSettingsSaving : t.accountSettingsSave}
        </button>
      </div>
      {state.isLoading ? (
        <p className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-4 text-sm font-semibold text-text-muted">
          {t.accountSettingsLoading}
        </p>
      ) : null}
      {state.account ? (
        <div className="mt-5 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold">
            {t.accountNameLabel}
            <input
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={isBusy || !canEdit}
              onChange={(event) => updateAccountName(event.currentTarget.value)}
              value={state.accountName}
            />
          </label>
          {!canEdit ? (
            <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800">
              {t.accountSettingsReadOnly}
            </p>
          ) : null}
        </div>
      ) : null}
      {state.error ? (
        <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
          <p>{state.error}</p>
          {!state.account ? (
            <button
              className="mt-3 rounded-lg border border-red-300 px-4 py-2 transition hover:bg-red-100"
              onClick={loadAccount}
              type="button"
            >
              {t.accountSettingsRetry}
            </button>
          ) : null}
        </div>
      ) : null}
      {state.success ? (
        <p className="mt-5 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">
          {state.success}
        </p>
      ) : null}
    </section>
  );
}

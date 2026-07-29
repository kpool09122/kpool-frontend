"use client";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
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
    <AccountSettingsPanel
      action={
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isBusy || !canEdit || !state.account}
          onClick={saveAccount}
          type="button"
        >
          {state.isSaving ? t.accountSettingsSaving : t.accountSettingsSave}
        </button>
      }
      title={t.accountInformationTitle}
    >
      {state.isLoading ? (
        <AccountStatusMessage className="mt-5" variant="loading">
          {t.accountSettingsLoading}
        </AccountStatusMessage>
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
            <AccountStatusMessage variant="warning">
              {t.accountSettingsReadOnly}
            </AccountStatusMessage>
          ) : null}
        </div>
      ) : null}
      {state.error ? (
        <AccountStatusMessage
          action={!state.account ? (
            <button
              className="mt-3 rounded-lg border border-red-300 px-4 py-2 transition hover:bg-red-100"
              onClick={loadAccount}
              type="button"
            >
              {t.accountSettingsRetry}
            </button>
          ) : null}
          className="mt-5"
          variant="error"
        >
          {state.error}
        </AccountStatusMessage>
      ) : null}
      {state.success ? (
        <AccountStatusMessage className="mt-5" variant="success">
          {state.success}
        </AccountStatusMessage>
      ) : null}
    </AccountSettingsPanel>
  );
}

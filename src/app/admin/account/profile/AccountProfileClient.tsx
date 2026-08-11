"use client";

import { useMemo } from "react";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { useI18n } from "../../../../i18n/I18nProvider";
import { useAccountSection } from "../AccountSectionContext";
import {
  countryCodes,
  getAdministrativeAreaOptions,
  getCountryLabel,
  isCountryCodeOption,
} from "./accountAddressOptions";
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
    updateProfileField,
  } = useAccountProfile({
    accountIdentifier,
    canEdit,
    t,
  });
  const { locale } = useI18n();
  const isBusy = state.isLoading || state.isSaving;
  const inputClassName = "rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60";
  const selectedCountryCode = isCountryCodeOption(state.address.countryCode) ? state.address.countryCode : "";
  const countryOptions = useMemo(
    () => countryCodes.map((countryCode) => ({
      code: countryCode,
      label: getCountryLabel(countryCode, locale),
    })),
    [locale],
  );
  const administrativeAreaOptions = useMemo(
    () => getAdministrativeAreaOptions(state.address.countryCode, locale),
    [locale, state.address.countryCode],
  );

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
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold md:col-span-2">
              {t.accountNameLabel}
              <input
                className={inputClassName}
                disabled={isBusy || !canEdit}
                onChange={(event) => updateProfileField("accountName", event.currentTarget.value)}
                value={state.accountName}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold md:col-span-2">
              {t.emailAddressLabel}
              <input
                className={inputClassName}
                disabled
                value={state.account.email}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold md:col-span-2">
              {t.accountPhoneLabel}
              <input
                className={inputClassName}
                disabled={isBusy || !canEdit}
                onChange={(event) => updateProfileField("phone", event.currentTarget.value)}
                placeholder={t.accountPhonePlaceholder}
                value={state.phone}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold md:col-span-2">
              {t.accountAddressLine1Label}
              <input
                className={inputClassName}
                disabled={isBusy || !canEdit}
                onChange={(event) => updateProfileField("addressLine1", event.currentTarget.value)}
                placeholder={t.accountAddressLine1Placeholder}
                value={state.address.addressLine1}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold md:col-span-2">
              {t.accountAddressLine2Label}
              <input
                className={inputClassName}
                disabled={isBusy || !canEdit}
                onChange={(event) => updateProfileField("addressLine2", event.currentTarget.value)}
                placeholder={t.accountAddressLine2Placeholder}
                value={state.address.addressLine2}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              {t.accountAddressLocalityLabel}
              <input
                className={inputClassName}
                disabled={isBusy || !canEdit}
                onChange={(event) => updateProfileField("locality", event.currentTarget.value)}
                placeholder={t.accountAddressLocalityPlaceholder}
                value={state.address.locality}
              />
            </label>
            {administrativeAreaOptions.length > 0 ? (
              <label className="grid gap-2 text-sm font-semibold">
                {t.accountAddressAdministrativeAreaCodeLabel}
                <select
                  className={inputClassName}
                  disabled={isBusy || !canEdit}
                  onChange={(event) => updateProfileField("administrativeAreaCode", event.currentTarget.value)}
                  value={state.address.administrativeAreaCode}
                >
                  <option value="">{t.accountAddressAdministrativeAreaCodePlaceholder}</option>
                  {administrativeAreaOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="grid gap-2 text-sm font-semibold">
              {t.accountAddressPostalCodeLabel}
              <input
                className={inputClassName}
                disabled={isBusy || !canEdit}
                onChange={(event) => updateProfileField("postalCode", event.currentTarget.value)}
                placeholder={t.accountAddressPostalCodePlaceholder}
                value={state.address.postalCode}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              {t.accountAddressCountryCodeLabel}
              <select
                className={inputClassName}
                disabled={isBusy || !canEdit}
                onChange={(event) => updateProfileField("countryCode", event.currentTarget.value)}
                value={selectedCountryCode}
              >
                <option value="">{t.accountAddressCountryCodePlaceholder}</option>
                {countryOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
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

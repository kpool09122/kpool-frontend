import { useCallback, useEffect, useState } from "react";

import { fetchAccount, updateAccount } from "@/gateways/account/accountBrowserApi";
import type { useI18n } from "../../../i18n/I18nProvider";
import type { MyPageAccountSettingsState } from "../../myPageTypes";

type UseAccountProfileParams = {
  accountIdentifier: string | null;
  canEdit: boolean;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
};

export const useAccountProfile = ({
  accountIdentifier,
  canEdit,
  t,
}: UseAccountProfileParams) => {
  const [state, setState] = useState<MyPageAccountSettingsState>(() => ({
    account: null,
    accountName: "",
    error: null,
    isLoading: false,
    isSaving: false,
    success: null,
  }));

  const loadAccount = useCallback(() => {
    if (!accountIdentifier) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
      success: null,
    }));

    void fetchAccount({
      accountIdentifier,
      fallbackErrorMessage: t.accountSettingsLoadFailed,
    }).then((account) => {
      setState({
        account,
        accountName: account.name,
        error: null,
        isLoading: false,
        isSaving: false,
        success: null,
      });
    }).catch((error: unknown) => {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.accountSettingsLoadFailed,
        isLoading: false,
        success: null,
      }));
    });
  }, [accountIdentifier, t.accountSettingsLoadFailed]);

  useEffect(() => {
    if (!state.account && !state.isLoading) {
      // Account pages are URL-addressable, so direct visits need to hydrate the account panel.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAccount();
    }
  }, [state.account, state.isLoading, loadAccount]);

  const updateAccountName = (value: string) => {
    setState((current) => ({
      ...current,
      accountName: value,
      error: null,
      success: null,
    }));
  };

  const saveAccount = () => {
    const accountName = state.accountName.trim();

    if (!accountIdentifier) {
      setState((current) => ({ ...current, error: t.accountSettingsUnavailable, success: null }));
      return;
    }

    if (!accountName) {
      setState((current) => ({ ...current, error: t.accountNameRequired, success: null }));
      return;
    }

    if (!canEdit) {
      setState((current) => ({ ...current, error: t.accountSettingsReadOnly, success: null }));
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isSaving: true,
      success: null,
    }));

    void updateAccount({
      accountIdentifier,
      fallbackErrorMessage: t.accountSettingsSaveFailed,
      requestBody: { accountName },
    }).then((account) => {
      setState({
        account,
        accountName: account.name,
        error: null,
        isLoading: false,
        isSaving: false,
        success: t.accountSettingsSaved,
      });
    }).catch((error: unknown) => {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.accountSettingsSaveFailed,
        isSaving: false,
        success: null,
      }));
    });
  };

  return {
    state,
    loadAccount,
    saveAccount,
    updateAccountName,
  };
};

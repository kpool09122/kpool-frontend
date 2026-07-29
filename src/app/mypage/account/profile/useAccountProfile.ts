import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { fetchAccount, updateAccount } from "@/gateways/account/accountBrowserApi";
import type { AccountSummary } from "@/gateways/account/accountApi";
import { myPageQueryKeys } from "../../queryKeys";
import type { useI18n } from "../../../../i18n/I18nProvider";
import type { MyPageAccountSettingsState } from "../../myPageTypes";

type UseAccountProfileParams = {
  accountIdentifier: string | null;
  canEdit: boolean;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
};

type AccountNameDraft = {
  accountIdentifier: string | null;
  isDirty: boolean;
  value: string;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const useAccountProfile = ({
  accountIdentifier,
  canEdit,
  t,
}: UseAccountProfileParams) => {
  const queryClient = useQueryClient();
  const queryKey = myPageQueryKeys.account.profile(accountIdentifier);
  const [accountNameDraft, setAccountNameDraft] = useState<AccountNameDraft>({
    accountIdentifier: null,
    isDirty: false,
    value: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const accountQuery = useQuery<AccountSummary, Error>({
    enabled: Boolean(accountIdentifier),
    queryFn: () => fetchAccount({
      accountIdentifier: accountIdentifier ?? "",
      fallbackErrorMessage: t.accountSettingsLoadFailed,
    }),
    queryKey,
    retry: false,
  });
  const usesAccountNameDraft = accountNameDraft.accountIdentifier === accountIdentifier &&
    accountNameDraft.isDirty;
  const accountName = usesAccountNameDraft
    ? accountNameDraft.value
    : accountQuery.data?.name ?? "";

  const saveMutation = useMutation<AccountSummary, Error, string>({
    mutationFn: (nextAccountName) => {
      if (!accountIdentifier) {
        return Promise.reject(new Error(t.accountSettingsUnavailable));
      }

      return updateAccount({
        accountIdentifier,
        fallbackErrorMessage: t.accountSettingsSaveFailed,
        requestBody: { accountName: nextAccountName },
      });
    },
    onMutate: () => {
      setFormError(null);
      setSuccess(null);
    },
    onSuccess: (account) => {
      queryClient.setQueryData(queryKey, account);
      setAccountNameDraft({
        accountIdentifier,
        isDirty: false,
        value: account.name,
      });
      setSuccess(t.accountSettingsSaved);
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, t.accountSettingsSaveFailed));
    },
  });

  const updateAccountName = (value: string) => {
    setAccountNameDraft({
      accountIdentifier,
      isDirty: true,
      value,
    });
    setFormError(null);
    setSuccess(null);
  };

  const saveAccount = () => {
    const nextAccountName = accountName.trim();

    if (!accountIdentifier) {
      setFormError(t.accountSettingsUnavailable);
      setSuccess(null);
      return;
    }

    if (!nextAccountName) {
      setFormError(t.accountNameRequired);
      setSuccess(null);
      return;
    }

    if (!canEdit) {
      setFormError(t.accountSettingsReadOnly);
      setSuccess(null);
      return;
    }

    saveMutation.mutate(nextAccountName);
  };

  const loadAccount = () => {
    setFormError(null);
    setSuccess(null);
    void accountQuery.refetch();
  };

  const state: MyPageAccountSettingsState = {
    account: accountQuery.data ?? null,
    accountName,
    error: formError ?? (accountQuery.error
      ? getErrorMessage(accountQuery.error, t.accountSettingsLoadFailed)
      : null),
    isLoading: accountQuery.isFetching && !accountQuery.data,
    isSaving: saveMutation.isPending,
    success,
  };

  return {
    state,
    loadAccount,
    saveAccount,
    updateAccountName,
  };
};

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  fetchAccount,
  fetchLatestAccountCategoryChangeRequest,
  requestAccountCategoryChange,
  withdrawAccountCategoryChangeRequest,
} from "@/gateways/account/accountBrowserApi";
import type { RequestAccountCategoryChangeRequest } from "@/gateways/account/accountApi";
import { adminQueryKeys } from "../../queryKeys";
import { useI18n } from "../../../../i18n/I18nProvider";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];
const selectableCategories = ["agency", "talent"] as const;
type Category = RequestAccountCategoryChangeRequest["requestedAccountCategory"];
type Operation = { accountIdentifier: string } & (
  | { action: "submit"; category: Category }
  | { action: "withdraw"; requestId: string }
);

export const useAccountCategoryChange = ({
  accountIdentifier,
  t,
}: {
  accountIdentifier: string | null;
  t: AdminDictionary;
}) => {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<Category>("agency");
  const accountQuery = useQuery({
    enabled: Boolean(accountIdentifier),
    queryFn: () =>
      fetchAccount({
        accountIdentifier: accountIdentifier ?? "",
        fallbackErrorMessage: t.accountSettingsLoadFailed,
      }),
    queryKey: adminQueryKeys.account.profile(accountIdentifier),
  });
  const requestQuery = useQuery({
    enabled: Boolean(accountIdentifier),
    queryFn: () =>
      fetchLatestAccountCategoryChangeRequest({
        accountIdentifier: accountIdentifier ?? "",
        locale,
        fallbackErrorMessage: t.accountCategoryChange.loadFailed,
      }),
    queryKey:
      adminQueryKeys.account.latestCategoryChangeRequest(accountIdentifier),
  });
  // Refresh after failure too: another actor may have approved/rejected the pending request.
  // Use mutation variables, never the currently selected account, for async cache updates.
  const refreshAccount = async (identifier: string | null) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.account.profile(identifier),
      }),
      queryClient.invalidateQueries({
        queryKey:
          adminQueryKeys.account.latestCategoryChangeRequest(identifier),
      }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: (operation: Operation) =>
      operation.action === "submit"
        ? requestAccountCategoryChange({
            accountIdentifier: operation.accountIdentifier,
            locale,
            fallbackErrorMessage: t.accountCategoryChange.submitFailed,
            requestBody: { requestedAccountCategory: operation.category },
          })
        : withdrawAccountCategoryChangeRequest({
            accountIdentifier: operation.accountIdentifier,
            locale,
            fallbackErrorMessage: t.accountCategoryChange.withdrawFailed,
            requestId: operation.requestId,
          }),
    onSettled: async (_data, _error, operation) => {
      await refreshAccount(operation.accountIdentifier);
    },
  });
  const currentCategory = accountQuery.data?.accountCategory ?? null;
  const request = requestQuery.data?.request ?? null;
  const queryError = accountQuery.error ?? requestQuery.error;
  const isLoading = accountQuery.isFetching || requestQuery.isFetching;
  const isReady =
    Boolean(accountIdentifier) &&
    accountQuery.isSuccess &&
    requestQuery.isSuccess &&
    !isLoading &&
    !mutation.isPending;
  const showForm =
    isReady && (request === null || request.status === "rejected");
  const canSubmit = showForm && selectedCategory !== currentCategory;
  const canWithdraw = isReady && request?.status === "pending";
  return {
    account: accountQuery.data ?? null,
    request,
    categoryOptions: selectableCategories.map((value) => ({
      value,
      disabled: value === currentCategory,
    })),
    currentCategory,
    selectedCategory,
    setSelectedCategory,
    showForm,
    canSubmit,
    canWithdraw,
    isLoading,
    isSubmitting: mutation.isPending,
    loadError: !accountIdentifier
      ? t.accountSettingsUnavailable
      : (queryError?.message ?? null),
    error: mutation.error?.message ?? null,
    success: mutation.isSuccess
      ? mutation.variables.action === "submit"
        ? t.accountCategoryChange.submitSucceeded
        : t.accountCategoryChange.withdrawSucceeded
      : null,
    retry: () => refreshAccount(accountIdentifier),
    submit: () => {
      if (canSubmit && accountIdentifier)
        mutation.mutate({
          action: "submit",
          accountIdentifier,
          category: selectedCategory,
        });
    },
    withdraw: () => {
      if (canWithdraw && accountIdentifier && request)
        mutation.mutate({
          action: "withdraw",
          accountIdentifier,
          requestId: request.requestIdentifier,
        });
    },
  };
};

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { fetchAccount, requestAccountCategoryChange } from "@/gateways/account/accountBrowserApi";
import type { AccountSummary, RequestAccountCategoryChangeRequest } from "@/gateways/account/accountApi";
import { adminQueryKeys } from "../../queryKeys";
import type { useI18n } from "../../../../i18n/I18nProvider";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];
const selectableCategories = ["agency", "talent"] as const;

export const useAccountCategoryChange = ({ accountIdentifier, t }: { accountIdentifier: string | null; t: AdminDictionary }) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<RequestAccountCategoryChangeRequest["requestedAccountCategory"]>("agency");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const accountQuery = useQuery<AccountSummary, Error>({
    enabled: Boolean(accountIdentifier),
    queryFn: () => fetchAccount({ accountIdentifier: accountIdentifier ?? "", fallbackErrorMessage: t.accountSettingsLoadFailed }),
    queryKey: adminQueryKeys.account.profile(accountIdentifier),
  });
  const currentCategory = accountQuery.data?.accountCategory ?? null;
  const categoryOptions = useMemo(() => selectableCategories.map((value) => ({ value, disabled: value === currentCategory })), [currentCategory]);
  const mutation = useMutation({
    mutationFn: () => {
      if (!accountIdentifier) return Promise.reject(new Error(t.accountSettingsUnavailable));
      if (selectedCategory === currentCategory) return Promise.reject(new Error(t.accountCategoryChange.sameCategoryError));
      return requestAccountCategoryChange({ accountIdentifier, fallbackErrorMessage: t.accountCategoryChange.submitFailed, requestBody: { requestedAccountCategory: selectedCategory } });
    },
    onError: (nextError) => { setSuccess(null); setError(nextError instanceof Error ? nextError.message : t.accountCategoryChange.submitFailed); },
    onSuccess: async () => { setError(null); setSuccess(t.accountCategoryChange.submitSucceeded); await queryClient.invalidateQueries({ queryKey: adminQueryKeys.account.profile(accountIdentifier) }); },
  });
  return { account: accountQuery.data ?? null, categoryOptions, currentCategory, error, isLoading: accountQuery.isLoading, isSubmitting: mutation.isPending, selectedCategory, setSelectedCategory, submit: () => mutation.mutate(), success };
};

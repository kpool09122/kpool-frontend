import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { fetchAccount, updateAccount } from "@/gateways/account/accountBrowserApi";
import type { AccountSummary, UpdateAccountRequest } from "@/gateways/account/accountApi";
import { adminQueryKeys } from "../../queryKeys";
import type { useI18n } from "../../../../i18n/I18nProvider";
import type { AdminAccountSettingsState } from "../../adminTypes";
import { isAdministrativeAreaSupportedByCountry } from "./accountAddressOptions";

type UseAccountProfileParams = {
  accountIdentifier: string | null;
  canEdit: boolean;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
};

type ProfileAddressDraft = {
  administrativeAreaCode: string;
  addressLine1: string;
  addressLine2: string;
  countryCode: string;
  locality: string;
  postalCode: string;
};

type AccountProfileDraft = {
  accountIdentifier: string | null;
  address: ProfileAddressDraft;
  isDirty: boolean;
  name: string;
  phone: string;
};

type ProfileField = "accountName" | "phone" | keyof ProfileAddressDraft;

const emptyAddressDraft = (): ProfileAddressDraft => ({
  administrativeAreaCode: "",
  addressLine1: "",
  addressLine2: "",
  countryCode: "",
  locality: "",
  postalCode: "",
});

const createEmptyDraft = (): AccountProfileDraft => ({
  accountIdentifier: null,
  address: emptyAddressDraft(),
  isDirty: false,
  name: "",
  phone: "",
});

const accountToDraft = (
  accountIdentifier: string | null,
  account: AccountSummary | null | undefined,
): AccountProfileDraft => ({
  accountIdentifier,
  address: {
    administrativeAreaCode: account?.address?.administrativeAreaCode ?? "",
    addressLine1: account?.address?.addressLine1 ?? "",
    addressLine2: account?.address?.addressLine2 ?? "",
    countryCode: account?.address?.countryCode ?? "",
    locality: account?.address?.locality ?? "",
    postalCode: account?.address?.postalCode ?? "",
  },
  isDirty: false,
  name: account?.name ?? "",
  phone: account?.phone ?? "",
});

const trimToNullable = (value: string): string | null => {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
};

const normalizeAddress = (address: ProfileAddressDraft): UpdateAccountRequest["address"] => {
  const normalizedAddress = {
    administrativeAreaCode: trimToNullable(address.administrativeAreaCode),
    addressLine1: trimToNullable(address.addressLine1),
    addressLine2: trimToNullable(address.addressLine2),
    countryCode: trimToNullable(address.countryCode),
    locality: trimToNullable(address.locality),
    postalCode: trimToNullable(address.postalCode),
  };

  return Object.values(normalizedAddress).some((value) => value !== null)
    ? normalizedAddress
    : null;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const useAccountProfile = ({
  accountIdentifier,
  canEdit,
  t,
}: UseAccountProfileParams) => {
  const queryClient = useQueryClient();
  const queryKey = adminQueryKeys.account.profile(accountIdentifier);
  const [profileDraft, setProfileDraft] = useState<AccountProfileDraft>(createEmptyDraft);
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
  const usesProfileDraft = profileDraft.accountIdentifier === accountIdentifier &&
    profileDraft.isDirty;
  const profile = usesProfileDraft
    ? profileDraft
    : accountToDraft(accountIdentifier, accountQuery.data);

  const saveMutation = useMutation<AccountSummary, Error, UpdateAccountRequest>({
    mutationFn: (requestBody) => {
      if (!accountIdentifier) {
        return Promise.reject(new Error(t.accountSettingsUnavailable));
      }

      return updateAccount({
        accountIdentifier,
        fallbackErrorMessage: t.accountSettingsSaveFailed,
        requestBody,
      });
    },
    onMutate: () => {
      setFormError(null);
      setSuccess(null);
    },
    onSuccess: (account) => {
      queryClient.setQueryData(queryKey, account);
      setProfileDraft(accountToDraft(accountIdentifier, account));
      setSuccess(t.accountSettingsSaved);
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, t.accountSettingsSaveFailed));
    },
  });

  const updateProfileField = (field: ProfileField, value: string) => {
    setProfileDraft((currentDraft) => {
      const baseDraft = currentDraft.accountIdentifier === accountIdentifier && currentDraft.isDirty
        ? currentDraft
        : accountToDraft(accountIdentifier, accountQuery.data);

      return field === "accountName"
        ? {
          ...baseDraft,
          accountIdentifier,
          isDirty: true,
          name: value,
        }
        : field === "phone"
          ? {
            ...baseDraft,
            accountIdentifier,
            isDirty: true,
            phone: value,
          }
          : field === "countryCode"
            ? {
              ...baseDraft,
              accountIdentifier,
              address: {
                ...baseDraft.address,
                administrativeAreaCode: isAdministrativeAreaSupportedByCountry(value, baseDraft.address.administrativeAreaCode)
                  ? baseDraft.address.administrativeAreaCode
                  : "",
                countryCode: value,
              },
              isDirty: true,
            }
            : {
              ...baseDraft,
              accountIdentifier,
              address: {
                ...baseDraft.address,
                [field]: value,
              },
              isDirty: true,
            };
    });
    setFormError(null);
    setSuccess(null);
  };

  const saveAccount = () => {
    const nextAccountName = profile.name.trim();

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

    saveMutation.mutate({
      accountName: nextAccountName,
      phone: trimToNullable(profile.phone),
      address: normalizeAddress(profile.address),
    });
  };

  const loadAccount = () => {
    setFormError(null);
    setSuccess(null);
    void accountQuery.refetch();
  };

  const state: AdminAccountSettingsState = {
    account: accountQuery.data ?? null,
    accountName: profile.name,
    address: profile.address,
    error: formError ?? (accountQuery.error
      ? getErrorMessage(accountQuery.error, t.accountSettingsLoadFailed)
      : null),
    isLoading: accountQuery.isFetching && !accountQuery.data,
    isSaving: saveMutation.isPending,
    phone: profile.phone,
    success,
  };

  return {
    state,
    loadAccount,
    saveAccount,
    updateProfileField,
  };
};

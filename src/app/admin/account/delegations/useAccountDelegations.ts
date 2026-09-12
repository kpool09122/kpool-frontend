"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";

import type { AffiliationSummary } from "@/gateways/account/accountApi";
import { fetchAffiliations, isAccountBrowserApiError, requestDelegation } from "@/gateways/account/accountBrowserApi";
import type { useI18n } from "../../../../i18n/I18nProvider";
import { adminQueryKeys } from "../../queryKeys";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];

type AffiliationAccount = AffiliationSummary["agencyAccount"];

export const getDelegationTargetAccount = (
  affiliation: AffiliationSummary,
  currentAccountIdentifier: string,
): AffiliationAccount | null => {
  if (affiliation.agencyAccountIdentifier === currentAccountIdentifier) {
    return affiliation.talentAccount;
  }

  if (affiliation.talentAccountIdentifier === currentAccountIdentifier) {
    return affiliation.agencyAccount;
  }

  return null;
};

export const useActiveDelegationAffiliations = ({
  enabled,
  t,
}: {
  enabled: boolean;
  t: AdminDictionary;
}) => useQuery({
  enabled,
  queryFn: () => fetchAffiliations({
    fallbackErrorMessage: t.accountDelegations.loadFailed,
    status: "active",
  }),
  queryKey: adminQueryKeys.account.affiliations({ status: "active" }),
});

const getRequestErrorMessage = (error: unknown, t: AdminDictionary): string => {
  if (isAccountBrowserApiError(error)) {
    if (error.accountRouteStatus === 403) return t.accountDelegations.forbidden;
    if (error.accountRouteStatus === 409) return t.accountDelegations.conflict;
  }

  return t.accountDelegations.requestFailed;
};

export const useRequestDelegation = (t: AdminDictionary) => {
  const inFlight = useRef(false);
  const mutation = useMutation({
    mutationFn: (targetAccountIdentifier: string) => requestDelegation({
      fallbackErrorMessage: t.accountDelegations.requestFailed,
      requestBody: { targetAccountIdentifier },
    }),
    mutationKey: adminQueryKeys.account.delegations(),
  });

  const submit = (targetAccountIdentifier: string) => {
    if (inFlight.current) return;

    inFlight.current = true;
    mutation.mutate(targetAccountIdentifier, {
      onSettled: () => {
        inFlight.current = false;
      },
    });
  };

  return {
    error: mutation.error ? getRequestErrorMessage(mutation.error, t) : null,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    submit,
  };
};

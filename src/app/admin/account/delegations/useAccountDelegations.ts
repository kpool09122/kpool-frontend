"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import type { AffiliationSummary } from "@/gateways/account/accountApi";
import { approveDelegation, fetchAffiliations, fetchDelegations, isAccountBrowserApiError, rejectDelegation, requestDelegation } from "@/gateways/account/accountBrowserApi";
import type { useI18n } from "../../../../i18n/I18nProvider";
import { adminQueryKeys } from "../../queryKeys";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];
type AffiliationAccount = AffiliationSummary["agencyAccount"];
type DelegationReviewVariables = { action: "approve" | "reject"; delegationId: string };

export const getDelegationTargetAccount = (
  affiliation: AffiliationSummary,
  currentAccountIdentifier: string,
): AffiliationAccount | null => {
  if (affiliation.agencyAccountIdentifier === currentAccountIdentifier) return affiliation.talentAccount;
  if (affiliation.talentAccountIdentifier === currentAccountIdentifier) return affiliation.agencyAccount;
  return null;
};

export const useActiveDelegationAffiliations = ({ enabled, t }: { enabled: boolean; t: AdminDictionary }) => useQuery({
  enabled,
  queryFn: () => fetchAffiliations({ fallbackErrorMessage: t.accountDelegations.loadFailed, status: "active" }),
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
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (targetAccountIdentifier: string) => requestDelegation({
      fallbackErrorMessage: t.accountDelegations.requestFailed,
      requestBody: { targetAccountIdentifier },
    }),
    mutationKey: adminQueryKeys.account.delegations.all(),
  });

  const submit = (targetAccountIdentifier: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    mutation.mutate(targetAccountIdentifier, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.account.delegations.all() });
      },
      onSettled: () => { inFlight.current = false; },
    });
  };

  return {
    error: mutation.error ? getRequestErrorMessage(mutation.error, t) : null,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    submit,
  };
};

export const useAccountDelegationLists = ({
  canRequestDelegation,
  canReviewDelegations,
  canShowDelegations,
  t,
}: {
  canRequestDelegation: boolean;
  canReviewDelegations: boolean;
  canShowDelegations: boolean;
  t: AdminDictionary;
}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const requestedKey = adminQueryKeys.account.delegations.list({ status: "pending", viewerRole: "requester" });
  const pendingKey = adminQueryKeys.account.delegations.list({ status: "pending", viewerRole: "approver" });
  const approvedKey = adminQueryKeys.account.delegations.list({ status: "approved" });
  const requestedQuery = useQuery({
    enabled: canRequestDelegation,
    queryFn: () => fetchDelegations({ fallbackErrorMessage: t.accountDelegations.loadRequestedPendingFailed, status: "pending", viewerRole: "requester" }),
    queryKey: requestedKey,
  });
  const pendingQuery = useQuery({
    enabled: canReviewDelegations,
    queryFn: () => fetchDelegations({ fallbackErrorMessage: t.accountDelegations.loadPendingFailed, status: "pending", viewerRole: "approver" }),
    queryKey: pendingKey,
  });
  const approvedQuery = useQuery({
    enabled: canShowDelegations,
    queryFn: () => fetchDelegations({ fallbackErrorMessage: t.accountDelegations.loadApprovedFailed, status: "approved" }),
    queryKey: approvedKey,
  });
  const reviewMutation = useMutation<void, Error, DelegationReviewVariables>({
    mutationFn: async ({ action, delegationId }) => {
      if (action === "approve") {
        await approveDelegation({ delegationId, fallbackErrorMessage: t.accountDelegations.approveFailed });
        return;
      }

      await rejectDelegation({ delegationId, fallbackErrorMessage: t.accountDelegations.rejectFailed });
    },
    onMutate: () => { setError(null); setSuccess(null); },
    onSuccess: (_data, variables) => {
      setSuccess(variables.action === "approve" ? t.accountDelegations.approveSucceeded : t.accountDelegations.rejectSucceeded);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: requestedKey }),
        queryClient.invalidateQueries({ queryKey: pendingKey }),
        queryClient.invalidateQueries({ queryKey: approvedKey }),
      ]);
    },
    onError: (caughtError, variables) => {
      setError(caughtError instanceof Error ? caughtError.message : variables.action === "approve" ? t.accountDelegations.approveFailed : t.accountDelegations.rejectFailed);
    },
  });

  return {
    approvedDelegations: approvedQuery.data?.delegations ?? [],
    approvedError: approvedQuery.error?.message ?? null,
    error,
    isApprovedLoading: approvedQuery.isLoading,
    isPendingLoading: pendingQuery.isLoading,
    isRequestedLoading: requestedQuery.isLoading,
    isReviewing: reviewMutation.isPending,
    pendingDelegations: pendingQuery.data?.delegations ?? [],
    pendingError: pendingQuery.error?.message ?? null,
    requestedDelegations: requestedQuery.data?.delegations ?? [],
    requestedError: requestedQuery.error?.message ?? null,
    submitReview: (action: "approve" | "reject", delegationId: string) => reviewMutation.mutate({ action, delegationId }),
    success,
  };
};

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { approveAffiliation, fetchAffiliations, rejectAffiliation, requestAffiliation } from "@/gateways/account/accountBrowserApi";
import { adminQueryKeys } from "../../queryKeys";
import type { useI18n } from "../../../../i18n/I18nProvider";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];

export const useAccountAffiliations = ({
  canRequestAffiliation,
  canReviewAffiliations,
  canShowAffiliations,
  t,
}: {
  canRequestAffiliation: boolean;
  canReviewAffiliations: boolean;
  canShowAffiliations: boolean;
  t: AdminDictionary;
}) => {
  const queryClient = useQueryClient();
  const [targetEmail, setTargetEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const pendingAffiliationsQueryKey = adminQueryKeys.account.affiliations({ status: "pending", viewerRole: "approver" });
  const requestedPendingAffiliationsQueryKey = adminQueryKeys.account.affiliations({ status: "pending", viewerRole: "requester" });
  const activeAffiliationsQueryKey = adminQueryKeys.account.affiliations({ status: "active" });
  const pendingAffiliationsQuery = useQuery({
    enabled: canReviewAffiliations,
    queryFn: () => fetchAffiliations({
      fallbackErrorMessage: t.accountAffiliations.loadPendingFailed,
      status: "pending",
      viewerRole: "approver",
    }),
    queryKey: pendingAffiliationsQueryKey,
  });
  const requestedPendingAffiliationsQuery = useQuery({
    enabled: canRequestAffiliation,
    queryFn: () => fetchAffiliations({
      fallbackErrorMessage: t.accountAffiliations.loadRequestedPendingFailed,
      status: "pending",
      viewerRole: "requester",
    }),
    queryKey: requestedPendingAffiliationsQueryKey,
  });
  const activeAffiliationsQuery = useQuery({
    enabled: canShowAffiliations,
    queryFn: () => fetchAffiliations({
      fallbackErrorMessage: t.accountAffiliations.loadActiveFailed,
      status: "active",
    }),
    queryKey: activeAffiliationsQueryKey,
  });

  const reloadAffiliations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: pendingAffiliationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: requestedPendingAffiliationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: activeAffiliationsQueryKey }),
    ]);
  };

  const submitRequest = async () => {
    const normalizedEmail = targetEmail.trim();
    if (!normalizedEmail) {
      setError(t.accountAffiliations.targetEmailRequired);
      setSuccess(null);
      return;
    }

    setIsRequesting(true);
    setError(null);
    setSuccess(null);
    await requestAffiliation({
      fallbackErrorMessage: t.accountAffiliations.requestFailed,
      requestBody: { targetEmail: normalizedEmail },
    })
      .then(() => {
        setTargetEmail("");
        setSuccess(t.accountAffiliations.requestSucceeded);
        void reloadAffiliations();
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : t.accountAffiliations.requestFailed);
      })
      .finally(() => {
        setIsRequesting(false);
      });
  };

  const submitReview = async (action: "approve" | "reject", targetAffiliationId: string) => {
    const normalizedAffiliationId = targetAffiliationId.trim();

    const reviewRequest = action === "approve"
      ? approveAffiliation({
          affiliationId: normalizedAffiliationId,
          fallbackErrorMessage: t.accountAffiliations.approveFailed,
        })
      : rejectAffiliation({
          affiliationId: normalizedAffiliationId,
          fallbackErrorMessage: t.accountAffiliations.rejectFailed,
        });

    setIsReviewing(true);
    setError(null);
    setSuccess(null);
    await reviewRequest
      .then(() => {
        setSuccess(action === "approve" ? t.accountAffiliations.approveSucceeded : t.accountAffiliations.rejectSucceeded);
        void reloadAffiliations();
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : action === "approve" ? t.accountAffiliations.approveFailed : t.accountAffiliations.rejectFailed);
      })
      .finally(() => {
        setIsReviewing(false);
      });
  };

  return {
    error,
    activeAffiliations: activeAffiliationsQuery.data?.affiliations ?? [],
    activeAffiliationsError: activeAffiliationsQuery.error?.message ?? null,
    isActiveAffiliationsLoading: activeAffiliationsQuery.isLoading,
    isPendingAffiliationsLoading: pendingAffiliationsQuery.isLoading,
    isRequestedPendingAffiliationsLoading: requestedPendingAffiliationsQuery.isLoading,
    isRequesting,
    isReviewing,
    pendingAffiliations: pendingAffiliationsQuery.data?.affiliations ?? [],
    pendingAffiliationsError: pendingAffiliationsQuery.error?.message ?? null,
    requestedPendingAffiliations: requestedPendingAffiliationsQuery.data?.affiliations ?? [],
    requestedPendingAffiliationsError: requestedPendingAffiliationsQuery.error?.message ?? null,
    setTargetEmail,
    submitRequest,
    submitReview,
    success,
    targetEmail,
  };
};

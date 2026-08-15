"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { approveAffiliation, rejectAffiliation, requestAffiliation } from "@/gateways/account/accountBrowserApi";
import type { useI18n } from "../../../../i18n/I18nProvider";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];

export const useAccountAffiliations = ({ t }: { t: AdminDictionary }) => {
  const searchParams = useSearchParams();
  const initialAffiliationId = useMemo(() => searchParams.get("affiliationId") ?? "", [searchParams]);
  const [targetEmail, setTargetEmail] = useState("");
  const [affiliationId, setAffiliationId] = useState(initialAffiliationId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);


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
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : t.accountAffiliations.requestFailed);
      })
      .finally(() => {
        setIsRequesting(false);
      });
  };

  const submitReview = async (action: "approve" | "reject") => {
    const normalizedAffiliationId = affiliationId.trim();
    if (!normalizedAffiliationId) {
      setError(t.accountAffiliations.affiliationIdRequired);
      setSuccess(null);
      return;
    }

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
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : action === "approve" ? t.accountAffiliations.approveFailed : t.accountAffiliations.rejectFailed);
      })
      .finally(() => {
        setIsReviewing(false);
      });
  };

  return {
    affiliationId,
    error,
    isRequesting,
    isReviewing,
    setAffiliationId,
    setTargetEmail,
    submitRequest,
    submitReview,
    success,
    targetEmail,
  };
};

"use client";

import { useState } from "react";

import { createOfficialCertificationActionRequestBody, type OfficialCertificationAction } from "@/gateways/wiki/officialCertification";
import { useAdmin } from "../../../AdminProvider";
import { useWikiSection } from "../../WikiSectionProvider";

type ReviewState = {
  action: OfficialCertificationAction;
  certificationIdentifier: string;
  error: string | null;
  isSubmitting: boolean;
  success: string | null;
};

export function OfficialCertificationReviewClient() {
  const { t } = useAdmin();
  const { officialCertificationAdapter } = useWikiSection();
  const [state, setState] = useState<ReviewState>({
    action: "approve",
    certificationIdentifier: "",
    error: null,
    isSubmitting: false,
    success: null,
  });
  const canSubmit = state.certificationIdentifier.trim().length > 0;

  const submitReview = () => {
    if (!canSubmit) {
      setState((current) => ({
        ...current,
        error: t.officialCertificationCertificationIdRequired,
        success: null,
      }));
      return;
    }

    setState((current) => ({ ...current, error: null, isSubmitting: true, success: null }));

    void officialCertificationAdapter.reviewOfficialCertification({
      action: state.action,
      fallbackErrorMessage: t.officialCertificationReviewFailed,
      requestBody: createOfficialCertificationActionRequestBody(state.certificationIdentifier.trim()),
    }).then((summary) => {
      setState((current) => ({
        ...current,
        error: null,
        isSubmitting: false,
        success: t.officialCertificationReviewSucceeded(summary.status),
      }));
    }).catch((error: unknown) => {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.officialCertificationReviewFailed,
        isSubmitting: false,
        success: null,
      }));
    });
  };

  return (
    <section className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-strong">{t.officialCertificationReviewTitle}</h2>
        <p className="text-sm leading-7 text-text-muted">{t.officialCertificationReviewDescription}</p>
        <p className="text-sm leading-7 text-text-muted">{t.officialCertificationReviewListUnavailable}</p>
      </div>
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submitReview();
        }}
      >
        <label className="grid gap-2 text-sm font-semibold text-text-strong">
          {t.officialCertificationCertificationIdLabel}
          <input
            className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-sm text-text-strong"
            disabled={state.isSubmitting}
            placeholder={t.officialCertificationCertificationIdPlaceholder}
            value={state.certificationIdentifier}
            onChange={(event) => {
              setState((current) => ({ ...current, certificationIdentifier: event.target.value }));
            }}
          />
        </label>
        <fieldset className="grid gap-2 text-sm font-semibold text-text-strong">
          <legend>{t.officialCertificationReviewActionLabel}</legend>
          <div className="flex flex-wrap gap-3 text-sm font-normal">
            <label className="inline-flex items-center gap-2">
              <input
                checked={state.action === "approve"}
                disabled={state.isSubmitting}
                name="officialCertificationAction"
                type="radio"
                value="approve"
                onChange={() => setState((current) => ({ ...current, action: "approve" }))}
              />
              {t.officialCertificationApprove}
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                checked={state.action === "reject"}
                disabled={state.isSubmitting}
                name="officialCertificationAction"
                type="radio"
                value="reject"
                onChange={() => setState((current) => ({ ...current, action: "reject" }))}
              />
              {t.officialCertificationReject}
            </label>
          </div>
        </fieldset>
        {state.error ? <p role="alert" className="text-sm font-semibold text-danger">{state.error}</p> : null}
        {state.success ? <p role="status" className="text-sm font-semibold text-success">{state.success}</p> : null}
        <button
          className="w-fit rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSubmit || state.isSubmitting}
          type="submit"
        >
          {state.isSubmitting ? t.officialCertificationReviewing : t.officialCertificationReviewSubmit}
        </button>
      </form>
    </section>
  );
}

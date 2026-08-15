"use client";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { useAccountSection } from "../AccountSectionContext";
import { useAccountAffiliations } from "./useAccountAffiliations";

export function AccountAffiliationsClient() {
  const {
    canApproveAffiliations,
    canReceiveAffiliationRequests,
    canRejectAffiliations,
    canRequestAffiliation,
    t,
  } = useAccountSection();
  const state = useAccountAffiliations({ t });
  const canReviewAffiliations = canReceiveAffiliationRequests || canApproveAffiliations || canRejectAffiliations;

  return (
    <AccountSettingsPanel description={t.accountAffiliations.description} title={t.accountAffiliations.title}>
      <div className="mt-5 grid gap-5">
        {state.success ? <AccountStatusMessage variant="success">{state.success}</AccountStatusMessage> : null}
        {state.error ? <AccountStatusMessage variant="error">{state.error}</AccountStatusMessage> : null}
        {!canRequestAffiliation && !canReviewAffiliations ? <AccountStatusMessage variant="warning">{t.accountAffiliations.readOnly}</AccountStatusMessage> : null}

        {canRequestAffiliation ? (
          <form
            className="grid gap-3 rounded-xl border border-stroke-subtle p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void state.submitRequest();
            }}
          >
            <div>
              <h3 className="font-semibold text-text-strong">{t.accountAffiliations.requestSectionTitle}</h3>
              <p className="mt-1 text-sm text-text-muted">{t.accountAffiliations.requestSectionDescription}</p>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-text-strong">
              {t.accountAffiliations.targetEmailLabel}
              <input
                className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-sm"
                onChange={(event) => state.setTargetEmail(event.target.value)}
                placeholder={t.accountAffiliations.targetEmailPlaceholder}
                type="email"
                value={state.targetEmail}
              />
            </label>
            <div>
              <button className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={state.isRequesting} type="submit">
                {state.isRequesting ? t.accountAffiliations.requesting : t.accountAffiliations.requestSubmit}
              </button>
            </div>
          </form>
        ) : null}

        {canReviewAffiliations ? (
          <section className="grid gap-3 rounded-xl border border-stroke-subtle p-4">
            <div>
              <h3 className="font-semibold text-text-strong">{t.accountAffiliations.reviewSectionTitle}</h3>
              <p className="mt-1 text-sm text-text-muted">{t.accountAffiliations.reviewSectionDescription}</p>
            </div>
            <AccountStatusMessage variant="warning">{t.accountAffiliations.listUnavailable}</AccountStatusMessage>
            <label className="grid gap-1 text-sm font-semibold text-text-strong">
              {t.accountAffiliations.affiliationIdLabel}
              <input
                className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-sm"
                onChange={(event) => state.setAffiliationId(event.target.value)}
                placeholder={t.accountAffiliations.affiliationIdPlaceholder}
                type="text"
                value={state.affiliationId}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              {canApproveAffiliations ? (
                <button className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={state.isReviewing} onClick={() => void state.submitReview("approve")} type="button">
                  {state.isReviewing ? t.accountAffiliations.reviewing : t.accountAffiliations.approve}
                </button>
              ) : null}
              {canRejectAffiliations ? (
                <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={state.isReviewing} onClick={() => void state.submitReview("reject")} type="button">
                  {state.isReviewing ? t.accountAffiliations.reviewing : t.accountAffiliations.reject}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </AccountSettingsPanel>
  );
}

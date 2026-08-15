"use client";

import { useId, useState } from "react";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import type { AffiliationSummary } from "@/gateways/account/accountApi";
import { useAccountSection } from "../AccountSectionContext";
import { useAccountAffiliations } from "./useAccountAffiliations";

type AffiliationManagementTabId = "active" | "receivedPending" | "request" | "sentPending";

type AffiliationManagementTab = {
  id: AffiliationManagementTabId;
  label: string;
};

const AffiliationAccounts = ({
  affiliation,
  labels,
}: {
  affiliation: AffiliationSummary;
  labels: {
    agency: string;
    talent: string;
  };
}) => (
  <div className="grid gap-2 md:grid-cols-2">
    <div className="grid gap-1">
      <p className="text-xs font-semibold text-text-muted">{labels.agency}</p>
      <p className="font-semibold text-text-strong">{affiliation.agencyAccount.name}</p>
      <p className="break-all text-sm text-text-muted">{affiliation.agencyAccount.email}</p>
    </div>
    <div className="grid gap-1">
      <p className="text-xs font-semibold text-text-muted">{labels.talent}</p>
      <p className="font-semibold text-text-strong">{affiliation.talentAccount.name}</p>
      <p className="break-all text-sm text-text-muted">{affiliation.talentAccount.email}</p>
    </div>
  </div>
);

export function AccountAffiliationsClient() {
  const instanceId = useId();
  const [activeTabId, setActiveTabId] = useState<AffiliationManagementTabId>("request");
  const {
    canApproveAffiliations,
    canReceiveAffiliationRequests,
    canRejectAffiliations,
    canRequestAffiliation,
    t,
  } = useAccountSection();
  const canReviewAffiliations = canReceiveAffiliationRequests || canApproveAffiliations || canRejectAffiliations;
  const canShowAffiliations = canRequestAffiliation || canReviewAffiliations;
  const state = useAccountAffiliations({ canRequestAffiliation, canReviewAffiliations, canShowAffiliations, t });
  const tabs: AffiliationManagementTab[] = [
    ...(canRequestAffiliation ? [{ id: "request" as const, label: t.accountAffiliations.requestTab }] : []),
    ...(canRequestAffiliation ? [{ id: "sentPending" as const, label: t.accountAffiliations.requestedPendingTab }] : []),
    ...(canReviewAffiliations ? [{ id: "receivedPending" as const, label: t.accountAffiliations.pendingTab }] : []),
    ...(canShowAffiliations ? [{ id: "active" as const, label: t.accountAffiliations.activeTab }] : []),
  ];
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  return (
    <AccountSettingsPanel description={t.accountAffiliations.description} title={t.accountAffiliations.title}>
      <div className="mt-5 grid gap-5">
        {state.success ? <AccountStatusMessage variant="success">{state.success}</AccountStatusMessage> : null}
        {state.error ? <AccountStatusMessage variant="error">{state.error}</AccountStatusMessage> : null}
        {state.pendingAffiliationsError ? <AccountStatusMessage variant="error">{state.pendingAffiliationsError}</AccountStatusMessage> : null}
        {state.requestedPendingAffiliationsError ? <AccountStatusMessage variant="error">{state.requestedPendingAffiliationsError}</AccountStatusMessage> : null}
        {state.activeAffiliationsError ? <AccountStatusMessage variant="error">{state.activeAffiliationsError}</AccountStatusMessage> : null}
        {!canShowAffiliations ? <AccountStatusMessage variant="warning">{t.accountAffiliations.readOnly}</AccountStatusMessage> : null}

        {activeTab ? (
          <div className="grid gap-4">
            <div className="overflow-x-auto border-b border-stroke-subtle">
              <div aria-label={t.accountAffiliations.tabsLabel} className="-mb-px flex gap-1" role="tablist">
                {tabs.map((tab) => {
                  const isSelected = activeTab.id === tab.id;

                  return (
                    <button
                      aria-controls={`${instanceId}-${tab.id}-panel`}
                      aria-selected={isSelected}
                      className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                        isSelected
                          ? "border-brand-primary text-text-strong"
                          : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
                      }`}
                      id={`${instanceId}-${tab.id}-tab`}
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      role="tab"
                      tabIndex={isSelected ? 0 : -1}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              aria-labelledby={`${instanceId}-${activeTab.id}-tab`}
              id={`${instanceId}-${activeTab.id}-panel`}
              role="tabpanel"
            >
              {activeTab.id === "request" ? (
                <form
                  className="grid gap-3"
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

              {activeTab.id === "sentPending" ? (
                <section className="grid gap-3">
            <div>
              <h3 className="font-semibold text-text-strong">{t.accountAffiliations.requestedPendingSectionTitle}</h3>
              <p className="mt-1 text-sm text-text-muted">{t.accountAffiliations.requestedPendingSectionDescription}</p>
            </div>
            {state.isRequestedPendingAffiliationsLoading ? <AccountStatusMessage variant="loading">{t.accountAffiliations.loadingRequestedPending}</AccountStatusMessage> : null}
            {!state.isRequestedPendingAffiliationsLoading && state.requestedPendingAffiliations.length === 0 ? <AccountStatusMessage variant="empty">{t.accountAffiliations.requestedPendingEmpty}</AccountStatusMessage> : null}
            <div className="grid gap-3">
              {state.requestedPendingAffiliations.map((affiliation) => (
                <article className="grid gap-3 rounded-lg border border-stroke-subtle p-3" key={affiliation.affiliationIdentifier}>
                  <AffiliationAccounts affiliation={affiliation} labels={{ agency: t.accountAffiliations.agencyAccountLabel, talent: t.accountAffiliations.talentAccountLabel }} />
                  <dl className="grid gap-2 text-sm">
                    <div><dt className="text-text-muted">{t.accountAffiliations.requestedAtLabel}</dt><dd className="text-text-strong">{affiliation.requestedAt}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
                </section>
              ) : null}

              {activeTab.id === "receivedPending" ? (
                <section className="grid gap-3">
            <div>
              <h3 className="font-semibold text-text-strong">{t.accountAffiliations.pendingSectionTitle}</h3>
              <p className="mt-1 text-sm text-text-muted">{t.accountAffiliations.pendingSectionDescription}</p>
            </div>
            {state.isPendingAffiliationsLoading ? <AccountStatusMessage variant="loading">{t.accountAffiliations.loadingPending}</AccountStatusMessage> : null}
            {!state.isPendingAffiliationsLoading && state.pendingAffiliations.length === 0 ? <AccountStatusMessage variant="empty">{t.accountAffiliations.pendingEmpty}</AccountStatusMessage> : null}
            <div className="grid gap-3">
              {state.pendingAffiliations.map((affiliation) => (
                <article className="grid gap-3 rounded-lg border border-stroke-subtle p-3" key={affiliation.affiliationIdentifier}>
                  <AffiliationAccounts affiliation={affiliation} labels={{ agency: t.accountAffiliations.agencyAccountLabel, talent: t.accountAffiliations.talentAccountLabel }} />
                  <dl className="grid gap-2 text-sm">
                    <div><dt className="text-text-muted">{t.accountAffiliations.requestedAtLabel}</dt><dd className="text-text-strong">{affiliation.requestedAt}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-3">
                    {canApproveAffiliations ? (
                      <button className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={state.isReviewing} onClick={() => void state.submitReview("approve", affiliation.affiliationIdentifier)} type="button">
                        {state.isReviewing ? t.accountAffiliations.reviewing : t.accountAffiliations.approve}
                      </button>
                    ) : null}
                    {canRejectAffiliations ? (
                      <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={state.isReviewing} onClick={() => void state.submitReview("reject", affiliation.affiliationIdentifier)} type="button">
                        {state.isReviewing ? t.accountAffiliations.reviewing : t.accountAffiliations.reject}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
                </section>
              ) : null}

              {activeTab.id === "active" ? (
                <section className="grid gap-3">
            <div>
              <h3 className="font-semibold text-text-strong">{t.accountAffiliations.activeSectionTitle}</h3>
              <p className="mt-1 text-sm text-text-muted">{t.accountAffiliations.activeSectionDescription}</p>
            </div>
            {state.isActiveAffiliationsLoading ? <AccountStatusMessage variant="loading">{t.accountAffiliations.loadingActive}</AccountStatusMessage> : null}
            {!state.isActiveAffiliationsLoading && state.activeAffiliations.length === 0 ? <AccountStatusMessage variant="empty">{t.accountAffiliations.activeEmpty}</AccountStatusMessage> : null}
            <div className="grid gap-3">
              {state.activeAffiliations.map((affiliation) => (
                <article className="grid gap-3 rounded-lg border border-stroke-subtle p-3" key={affiliation.affiliationIdentifier}>
                  <AffiliationAccounts affiliation={affiliation} labels={{ agency: t.accountAffiliations.agencyAccountLabel, talent: t.accountAffiliations.talentAccountLabel }} />
                  <dl className="grid gap-2 text-sm">
                    <div><dt className="text-text-muted">{t.accountAffiliations.activatedAtLabel}</dt><dd className="text-text-strong">{affiliation.activatedAt ?? "-"}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </AccountSettingsPanel>
  );
}

"use client";

import { useId, useState } from "react";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import type { AccountDelegationSummary, AffiliationSummary } from "@/gateways/account/accountApi";
import { useAccountSection } from "../AccountSectionContext";
import { getDelegationTargetAccount, useAccountDelegationLists, useActiveDelegationAffiliations, useRequestDelegation } from "./useAccountDelegations";

type TabId = "request" | "requested" | "pending" | "approved";
type DelegationCardProps = { affiliation: AffiliationSummary; currentAccountIdentifier: string; t: ReturnType<typeof useAccountSection>["t"] };
type DelegationAccountSummary = NonNullable<AccountDelegationSummary["delegateAccount"]>;

const DelegationAffiliationCard = ({ affiliation, currentAccountIdentifier, t }: DelegationCardProps) => {
  const targetAccount = getDelegationTargetAccount(affiliation, currentAccountIdentifier);
  const request = useRequestDelegation(t);
  if (!targetAccount) return null;
  return (
    <article className="grid gap-4 rounded-lg border border-stroke-subtle p-4">
      <div className="grid gap-1">
        <p className="text-xs font-semibold text-text-muted">{t.accountDelegations.targetAccount}</p>
        <p className="font-semibold text-text-strong">{targetAccount.name}</p>
        <p className="break-all text-sm text-text-muted">{targetAccount.email}</p>
      </div>
      {request.isSuccess ? <AccountStatusMessage variant="success">{t.accountDelegations.requestSucceeded}</AccountStatusMessage> : null}
      {request.error ? <AccountStatusMessage variant="error">{request.error}</AccountStatusMessage> : null}
      <div><button className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={request.isPending || request.isSuccess} onClick={() => request.submit(targetAccount.accountIdentifier)} type="button">{request.isPending ? t.accountDelegations.requesting : t.accountDelegations.request}</button></div>
    </article>
  );
};

const DelegationAccountDetails = ({
  account,
  label,
}: {
  account: DelegationAccountSummary | undefined;
  label: string;
}) => (
  <div className="grid gap-1">
    <dt className="text-xs font-semibold text-text-muted">{label}</dt>
    <dd className="text-base font-semibold text-text-strong">{account?.name ?? "-"}</dd>
    {account?.email ? <dd className="break-all text-text-muted">{account.email}</dd> : null}
  </div>
);

const DelegationDetails = ({ delegation, t }: { delegation: AccountDelegationSummary; t: ReturnType<typeof useAccountSection>["t"] }) => (
  <dl className="grid gap-2 text-sm md:grid-cols-2">
    <DelegationAccountDetails account={delegation.delegateAccount} label={t.accountDelegations.delegateAccount} />
    <DelegationAccountDetails account={delegation.delegatorAccount} label={t.accountDelegations.delegatorAccount} />
    <div><dt className="text-text-muted">{t.accountDelegations.requestedAt}</dt><dd className="text-text-strong">{delegation.requestedAt}</dd></div>
    {delegation.approvedAt ? <div><dt className="text-text-muted">{t.accountDelegations.approvedAt}</dt><dd className="text-text-strong">{delegation.approvedAt}</dd></div> : null}
  </dl>
);

export function AccountDelegationsClient() {
  const instanceId = useId();
  const [selectedTabId, setSelectedTabId] = useState<TabId>("request");
  const { accountIdentifier, canApproveDelegations, canRejectDelegations, canRequestDelegation, t } = useAccountSection();
  const canReviewDelegations = canApproveDelegations || canRejectDelegations;
  const canShowDelegations = canRequestDelegation || canReviewDelegations;
  const affiliationsQuery = useActiveDelegationAffiliations({ enabled: canRequestDelegation && Boolean(accountIdentifier), t });
  const lists = useAccountDelegationLists({ canRequestDelegation, canReviewDelegations, canShowDelegations, t });
  const validAffiliations = accountIdentifier ? (affiliationsQuery.data?.affiliations ?? []).filter((item) => getDelegationTargetAccount(item, accountIdentifier) !== null) : [];
  const tabs = [
    ...(canRequestDelegation ? [{ id: "request" as const, label: t.accountDelegations.requestTab }, { id: "requested" as const, label: t.accountDelegations.requestedPendingTab }] : []),
    ...(canReviewDelegations ? [{ id: "pending" as const, label: t.accountDelegations.pendingTab }] : []),
    ...(canShowDelegations ? [{ id: "approved" as const, label: t.accountDelegations.approvedTab }] : []),
  ];
  const activeTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0] ?? null;

  const renderList = (items: AccountDelegationSummary[], isLoading: boolean, loadMessage: string, emptyMessage: string, error: string | null, allowReview = false) => (
    <div className="grid gap-3">
      {isLoading ? <AccountStatusMessage variant="loading">{loadMessage}</AccountStatusMessage> : null}
      {error ? <AccountStatusMessage variant="error">{error}</AccountStatusMessage> : null}
      {!isLoading && !error && items.length === 0 ? <AccountStatusMessage variant="empty">{emptyMessage}</AccountStatusMessage> : null}
      {items.map((delegation) => (
        <article className="grid gap-3 rounded-lg border border-stroke-subtle p-4" key={delegation.delegationIdentifier}>
          <DelegationDetails delegation={delegation} t={t} />
          {allowReview ? <div className="flex flex-wrap gap-3">
            {canApproveDelegations ? <button className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={lists.isReviewing} onClick={() => lists.submitReview("approve", delegation.delegationIdentifier)} type="button">{lists.isReviewing ? t.accountDelegations.reviewing : t.accountDelegations.approve}</button> : null}
            {canRejectDelegations ? <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={lists.isReviewing} onClick={() => lists.submitReview("reject", delegation.delegationIdentifier)} type="button">{lists.isReviewing ? t.accountDelegations.reviewing : t.accountDelegations.reject}</button> : null}
          </div> : null}
        </article>
      ))}
    </div>
  );

  return <AccountSettingsPanel description={t.accountDelegations.description} title={t.accountDelegations.title}>
    <div className="mt-5 grid gap-5">
      {lists.success ? <AccountStatusMessage variant="success">{lists.success}</AccountStatusMessage> : null}
      {lists.error ? <AccountStatusMessage variant="error">{lists.error}</AccountStatusMessage> : null}
      {activeTab ? <div className="grid gap-4">
        <div className="overflow-x-auto border-b border-stroke-subtle"><div aria-label={t.accountDelegations.tabsLabel} className="-mb-px flex gap-1" role="tablist">
          {tabs.map((tab) => { const selected = activeTab.id === tab.id; return <button aria-controls={`${instanceId}-${tab.id}-panel`} aria-selected={selected} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${selected ? "border-brand-primary text-text-strong" : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"}`} id={`${instanceId}-${tab.id}-tab`} key={tab.id} onClick={() => setSelectedTabId(tab.id)} role="tab" tabIndex={selected ? 0 : -1} type="button">{tab.label}</button>; })}
        </div></div>
        <div aria-labelledby={`${instanceId}-${activeTab.id}-tab`} id={`${instanceId}-${activeTab.id}-panel`} role="tabpanel">
          {activeTab.id === "request" ? <section className="grid gap-3">
            {affiliationsQuery.isLoading ? <AccountStatusMessage variant="loading">{t.accountDelegations.loading}</AccountStatusMessage> : null}
            {affiliationsQuery.error ? <AccountStatusMessage variant="error">{t.accountDelegations.loadFailed}</AccountStatusMessage> : null}
            {!affiliationsQuery.isLoading && !affiliationsQuery.error && validAffiliations.length === 0 ? <AccountStatusMessage variant="empty">{t.accountDelegations.empty}</AccountStatusMessage> : null}
            {accountIdentifier ? validAffiliations.map((affiliation) => <DelegationAffiliationCard affiliation={affiliation} currentAccountIdentifier={accountIdentifier} key={affiliation.affiliationIdentifier} t={t} />) : null}
          </section> : null}
          {activeTab.id === "requested" ? renderList(lists.requestedDelegations, lists.isRequestedLoading, t.accountDelegations.loadingRequestedPending, t.accountDelegations.requestedPendingEmpty, lists.requestedError) : null}
          {activeTab.id === "pending" ? renderList(lists.pendingDelegations, lists.isPendingLoading, t.accountDelegations.loadingPending, t.accountDelegations.pendingEmpty, lists.pendingError, true) : null}
          {activeTab.id === "approved" ? renderList(lists.approvedDelegations, lists.isApprovedLoading, t.accountDelegations.loadingApproved, t.accountDelegations.approvedEmpty, lists.approvedError) : null}
        </div>
      </div> : null}
    </div>
  </AccountSettingsPanel>;
}

"use client";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import type { AffiliationSummary } from "@/gateways/account/accountApi";
import { useAccountSection } from "../AccountSectionContext";
import { getDelegationTargetAccount, useActiveDelegationAffiliations, useRequestDelegation } from "./useAccountDelegations";

type DelegationCardProps = {
  affiliation: AffiliationSummary;
  currentAccountIdentifier: string;
  t: ReturnType<typeof useAccountSection>["t"];
};

const DelegationAffiliationCard = ({
  affiliation,
  currentAccountIdentifier,
  t,
}: DelegationCardProps) => {
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
      <div>
        <button
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={request.isPending || request.isSuccess}
          onClick={() => request.submit(targetAccount.accountIdentifier)}
          type="button"
        >
          {request.isPending ? t.accountDelegations.requesting : t.accountDelegations.request}
        </button>
      </div>
    </article>
  );
};

export function AccountDelegationsClient() {
  const { accountIdentifier, canRequestDelegation, t } = useAccountSection();
  const affiliationsQuery = useActiveDelegationAffiliations({
    enabled: canRequestDelegation && Boolean(accountIdentifier),
    t,
  });
  const affiliations = affiliationsQuery.data?.affiliations ?? [];
  const validAffiliations = accountIdentifier
    ? affiliations.filter((affiliation) => getDelegationTargetAccount(affiliation, accountIdentifier) !== null)
    : [];

  return (
    <AccountSettingsPanel description={t.accountDelegations.description} title={t.accountDelegations.title}>
      <div className="mt-5 grid gap-4">
        {affiliationsQuery.isLoading ? <AccountStatusMessage variant="loading">{t.accountDelegations.loading}</AccountStatusMessage> : null}
        {affiliationsQuery.error ? <AccountStatusMessage variant="error">{t.accountDelegations.loadFailed}</AccountStatusMessage> : null}
        {!affiliationsQuery.isLoading && !affiliationsQuery.error && validAffiliations.length === 0 ? (
          <AccountStatusMessage variant="empty">{t.accountDelegations.empty}</AccountStatusMessage>
        ) : null}
        {accountIdentifier ? validAffiliations.map((affiliation) => (
          <DelegationAffiliationCard
            affiliation={affiliation}
            currentAccountIdentifier={accountIdentifier}
            key={affiliation.affiliationIdentifier}
            t={t}
          />
        )) : null}
      </div>
    </AccountSettingsPanel>
  );
}

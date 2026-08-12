"use client";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { useAccountSection } from "../AccountSectionContext";
import { useAccountCategoryChangeRequests } from "./useAccountCategoryChangeRequests";

const getCategoryLabel = (labels: Record<string, string>, category: string): string => labels[category] ?? category;

export function AccountCategoryChangeRequestsClient() {
  const { canManageCategoryChangeRequests, t } = useAccountSection();
  const state = useAccountCategoryChangeRequests({ canManage: canManageCategoryChangeRequests, t });
  const labels = t.accountCategoryLabels;
  return (
    <AccountSettingsPanel description={t.accountCategoryChangeRequests.description} title={t.accountCategoryChangeRequests.title}>
      <div className="mt-5 grid gap-4">
        {!canManageCategoryChangeRequests ? <AccountStatusMessage variant="warning">{t.accountCategoryChangeRequests.readOnly}</AccountStatusMessage> : null}
        {state.isLoading ? <AccountStatusMessage variant="loading">{t.accountCategoryChangeRequests.loading}</AccountStatusMessage> : null}
        {state.error ? <AccountStatusMessage variant="error">{state.error}</AccountStatusMessage> : null}
        {state.data && state.data.requests.length === 0 ? <AccountStatusMessage variant="empty">{t.accountCategoryChangeRequests.empty}</AccountStatusMessage> : null}
        <div className="grid gap-3">
          {state.data?.requests.map((request) => (
            <button className="rounded-xl border border-stroke-subtle bg-surface-raised p-4 text-left transition hover:border-brand-primary" key={request.requestIdentifier} onClick={() => state.openDetail(request.requestIdentifier)} type="button">
              <div className="grid gap-1">
                <p className="font-semibold text-text-strong">{request.account.name}</p>
                <p className="break-all text-sm text-text-muted">{request.account.email}</p>
              </div>
              <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <div><dt className="text-text-muted">{t.accountCategoryChangeRequests.categoryTransition}</dt><dd className="text-text-strong">{getCategoryLabel(labels, request.currentAccountCategory)} → {getCategoryLabel(labels, request.requestedAccountCategory)}</dd></div>
                <div><dt className="text-text-muted">{t.accountCategoryChangeRequests.requestedAt}</dt><dd>{request.requestedAt}</dd></div>
              </dl>
            </button>
          ))}
        </div>
        {state.data ? <nav aria-label={t.accountCategoryChangeRequests.pagination} className="flex items-center gap-3"><button className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm disabled:opacity-50" disabled={state.data.current_page <= 1} onClick={() => state.setPage(state.data!.current_page - 1)} type="button">{t.accountCategoryChangeRequests.previous}</button><span className="text-sm text-text-muted">{state.data.current_page}/{state.data.last_page} ({state.data.total})</span><button className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm disabled:opacity-50" disabled={state.data.current_page >= state.data.last_page} onClick={() => state.setPage(state.data!.current_page + 1)} type="button">{t.accountCategoryChangeRequests.next}</button></nav> : null}
      </div>
    </AccountSettingsPanel>
  );
}

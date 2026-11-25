"use client";

import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import Link from "next/link";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { AccountInformationDetails } from "../../AccountInformationDetails";
import { useAccountSection } from "../../AccountSectionContext";
import { rejectionReasonCodes, useAccountCategoryChangeRequestDetail } from "./useAccountCategoryChangeRequestDetail";

const getCategoryLabel = (labels: Record<string, string>, category: string): string => labels[category] ?? category;

export function AccountCategoryChangeRequestDetailClient() {
  const { canManageCategoryChangeRequests, t } = useAccountSection();
  const state = useAccountCategoryChangeRequestDetail({ canManage: canManageCategoryChangeRequests, t });
  const labels = t.accountCategoryLabels;
  const detail = state.data;
  return (
    <AccountSettingsPanel
      action={
        <Link className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm font-semibold text-text-strong transition hover:border-brand-primary" href="/admin/account/category-change-requests">
          {t.accountCategoryChangeRequestDetail.backToList}
        </Link>
      }
      title={t.accountCategoryChangeRequestDetail.title}
    >
      <div className="mt-5 grid gap-5">
        {!canManageCategoryChangeRequests ? <AccountStatusMessage variant="warning">{t.accountCategoryChangeRequests.readOnly}</AccountStatusMessage> : null}
        {state.isLoading ? <AccountStatusMessage variant="loading">{t.accountCategoryChangeRequestDetail.loading}</AccountStatusMessage> : null}
        {state.error ? <AccountStatusMessage variant="error">{state.error}</AccountStatusMessage> : null}
        {detail ? <>
          <section className="rounded-xl border border-stroke-subtle p-4"><h3 className="font-semibold text-text-strong">{t.accountCategoryChangeRequestDetail.requestSection}</h3><p className="mt-2 text-sm text-text-muted">{t.accountCategoryChange.statusLabels[detail.request.status]}</p><dl className="mt-3 grid gap-2 text-sm md:grid-cols-2"><div><dt className="text-text-muted">{t.accountCategoryChangeRequests.categoryTransition}</dt><dd>{getCategoryLabel(labels, detail.request.currentAccountCategory)} → {getCategoryLabel(labels, detail.request.requestedAccountCategory)}</dd></div><div><dt className="text-text-muted">{t.accountCategoryChangeRequests.requestedAt}</dt><dd><LocalizedDateTime value={detail.request.requestedAt} /></dd></div>{detail.request.rejectionReason ? <div><dt className="text-text-muted">{t.accountCategoryChangeRequestDetail.rejectionReason}</dt><dd>{detail.request.rejectionReason.code} {detail.request.rejectionReason.detail ?? ""}</dd></div> : null}</dl></section>
          <AccountInformationDetails
            account={{ ...detail.account, ...detail.account.address }}
            category={getCategoryLabel(labels, detail.account.accountCategory)}
            documents={detail.documents.map(document => {
              const viewUrl = `/api/account/category-change-requests/${detail.request.requestIdentifier}/documents/${encodeURIComponent(document.documentType)}`;
              return { ...document, viewUrl, downloadUrl: `${viewUrl}?download=1` };
            })}
          />
          {detail.request.status === "pending" ? <div className="flex gap-3"><button className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60" disabled={state.isReviewing} onClick={state.approve} type="button">{t.accountCategoryChangeRequestDetail.approve}</button><button className="rounded-lg border border-stroke-subtle px-5 py-2.5 text-sm font-semibold text-text-strong disabled:opacity-60" disabled={state.isReviewing} onClick={() => state.setRejectDialogOpen(true)} type="button">{t.accountCategoryChangeRequestDetail.reject}</button></div> : null}
        </> : null}
        {state.rejectDialogOpen ? <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog"><div className="grid w-full max-w-md gap-4 rounded-xl bg-surface-raised p-5 shadow-lg"><h3 className="font-semibold text-text-strong">{t.accountCategoryChangeRequestDetail.rejectDialogTitle}</h3><label className="grid gap-2 text-sm"><span>{t.accountCategoryChangeRequestDetail.rejectionReasonCode}</span><select className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2" onChange={(e) => state.setRejectionReasonCode(e.currentTarget.value as typeof state.rejectionReasonCode)} value={state.rejectionReasonCode}>{rejectionReasonCodes.map((code) => <option key={code} value={code}>{t.accountCategoryChangeRequestDetail.rejectionReasonLabels[code] ?? code}</option>)}</select></label><label className="grid gap-2 text-sm"><span>{t.accountCategoryChangeRequestDetail.rejectionReasonDetail}</span><textarea className="min-h-24 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2" onChange={(e) => state.setRejectionReasonDetail(e.currentTarget.value)} value={state.rejectionReasonDetail} /></label>{state.detailRequired && !state.canSubmitReject ? <p className="text-sm text-status-danger">{t.accountCategoryChangeRequestDetail.rejectionReasonDetailRequired}</p> : null}<div className="flex justify-end gap-3"><button className="rounded-lg border border-stroke-subtle px-4 py-2" onClick={() => state.setRejectDialogOpen(false)} type="button">{t.accountCategoryChangeRequestDetail.cancel}</button><button className="rounded-lg bg-brand-primary px-4 py-2 text-on-primary disabled:opacity-60" disabled={!state.canSubmitReject || state.isReviewing} onClick={state.reject} type="button">{t.accountCategoryChangeRequestDetail.submitReject}</button></div></div></div> : null}
      </div>
    </AccountSettingsPanel>
  );
}

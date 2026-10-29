/* eslint-disable @next/next/no-img-element -- Account review documents should render directly from the private BFF document route. */
"use client";

import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import Link from "next/link";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { useAccountSection } from "../../AccountSectionContext";
import { rejectionReasonCodes, useAccountCategoryChangeRequestDetail } from "./useAccountCategoryChangeRequestDetail";

const isPdfDocument = (documentPath: string): boolean => /\.pdf(?:[?#].*)?$/i.test(documentPath);
const fileName = (path: string): string => path.split(/[\/]/).pop() || path;

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
          <section className="rounded-xl border border-stroke-subtle p-4"><h3 className="font-semibold text-text-strong">{t.accountCategoryChangeRequestDetail.accountSection}</h3><dl className="mt-3 grid gap-2 text-sm md:grid-cols-2"><div><dt className="text-text-muted">{t.accountNameLabel}</dt><dd>{detail.account.name}</dd></div><div><dt className="text-text-muted">{t.emailAddressLabel}</dt><dd>{detail.account.email}</dd></div><div><dt className="text-text-muted">{t.accountCategoryChangeRequestDetail.accountType}</dt><dd>{detail.account.type}</dd></div><div><dt className="text-text-muted">{t.accountCategoryChangeRequestDetail.accountCategory}</dt><dd>{getCategoryLabel(labels, detail.account.accountCategory)}</dd></div><div><dt className="text-text-muted">{t.accountCategoryChangeRequestDetail.accountStatus}</dt><dd>{detail.account.status}</dd></div><div><dt className="text-text-muted">{t.accountPhoneLabel}</dt><dd>{detail.account.phone ?? "-"}</dd></div><div><dt className="text-text-muted">{t.accountAddressCountryCodeLabel}</dt><dd>{detail.account.address?.countryCode ?? "-"}</dd></div><div><dt className="text-text-muted">{t.accountAddressAdministrativeAreaCodeLabel}</dt><dd>{detail.account.address?.administrativeAreaCode ?? "-"}</dd></div><div><dt className="text-text-muted">{t.accountAddressPostalCodeLabel}</dt><dd>{detail.account.address?.postalCode ?? "-"}</dd></div><div><dt className="text-text-muted">{t.accountAddressLocalityLabel}</dt><dd>{detail.account.address?.locality ?? "-"}</dd></div><div><dt className="text-text-muted">{t.accountAddressLine1Label}</dt><dd>{detail.account.address?.addressLine1 ?? "-"}</dd></div><div><dt className="text-text-muted">{t.accountAddressLine2Label}</dt><dd>{detail.account.address?.addressLine2 ?? "-"}</dd></div></dl></section>
          <section className="rounded-xl border border-stroke-subtle p-4"><h3 className="font-semibold text-text-strong">{t.accountCategoryChangeRequestDetail.documentsSection}</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{detail.documents.map((document) => { const viewUrl = `/api/account/category-change-requests/${detail.request.requestIdentifier}/documents/${encodeURIComponent(document.documentType)}`; const downloadUrl = `${viewUrl}?download=1`; return <a className="rounded-lg border border-stroke-subtle p-3 text-sm" download={fileName(document.documentPath)} href={downloadUrl} key={document.documentType}>{isPdfDocument(document.documentPath) ? <span className="font-semibold">PDF: {fileName(document.documentPath)}</span> : <img alt={document.documentType} className="mb-2 h-auto w-full rounded" src={viewUrl} />}<span className="block break-all text-text-muted">{document.documentType} / <LocalizedDateTime value={document.uploadedAt} /></span></a>; })}</div></section>
          {detail.request.status === "pending" ? <div className="flex gap-3"><button className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60" disabled={state.isReviewing} onClick={state.approve} type="button">{t.accountCategoryChangeRequestDetail.approve}</button><button className="rounded-lg border border-stroke-subtle px-5 py-2.5 text-sm font-semibold text-text-strong disabled:opacity-60" disabled={state.isReviewing} onClick={() => state.setRejectDialogOpen(true)} type="button">{t.accountCategoryChangeRequestDetail.reject}</button></div> : null}
        </> : null}
        {state.rejectDialogOpen ? <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog"><div className="grid w-full max-w-md gap-4 rounded-xl bg-surface-raised p-5 shadow-lg"><h3 className="font-semibold text-text-strong">{t.accountCategoryChangeRequestDetail.rejectDialogTitle}</h3><label className="grid gap-2 text-sm"><span>{t.accountCategoryChangeRequestDetail.rejectionReasonCode}</span><select className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2" onChange={(e) => state.setRejectionReasonCode(e.currentTarget.value as typeof state.rejectionReasonCode)} value={state.rejectionReasonCode}>{rejectionReasonCodes.map((code) => <option key={code} value={code}>{t.accountCategoryChangeRequestDetail.rejectionReasonLabels[code] ?? code}</option>)}</select></label><label className="grid gap-2 text-sm"><span>{t.accountCategoryChangeRequestDetail.rejectionReasonDetail}</span><textarea className="min-h-24 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2" onChange={(e) => state.setRejectionReasonDetail(e.currentTarget.value)} value={state.rejectionReasonDetail} /></label>{state.detailRequired && !state.canSubmitReject ? <p className="text-sm text-status-danger">{t.accountCategoryChangeRequestDetail.rejectionReasonDetailRequired}</p> : null}<div className="flex justify-end gap-3"><button className="rounded-lg border border-stroke-subtle px-4 py-2" onClick={() => state.setRejectDialogOpen(false)} type="button">{t.accountCategoryChangeRequestDetail.cancel}</button><button className="rounded-lg bg-brand-primary px-4 py-2 text-on-primary disabled:opacity-60" disabled={!state.canSubmitReject || state.isReviewing} onClick={state.reject} type="button">{t.accountCategoryChangeRequestDetail.submitReject}</button></div></div></div> : null}
      </div>
    </AccountSettingsPanel>
  );
}

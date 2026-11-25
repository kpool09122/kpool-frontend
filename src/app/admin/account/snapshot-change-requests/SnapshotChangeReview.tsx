"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { fetchSnapshotComparison, reviewSnapshotChange, snapshotSchemas, snapshotRequestPath } from "@/gateways/account/accountSnapshotApi";
import type { z } from "zod";
import { accountSnapshotCopy } from "@/i18n/accountSnapshot";
import { useI18n } from "@/i18n/I18nProvider";
import { adminQueryKeys } from "../../queryKeys";
import { snapshotButtonClass } from "../AccountSnapshotPanel";

type RejectionCode = z.infer<typeof snapshotSchemas.reviewBody>["rejectionReasonCode"];
export function SnapshotChangeReview(props: { requestId: string; accountIdentifier: string | null; canManage: boolean; actor?: string | null }) {
  return <Review key={`${props.accountIdentifier}:${props.actor}:${props.requestId}:${props.canManage}`} {...props} />;
}
function Review({ requestId, accountIdentifier, canManage, actor }: { requestId: string; accountIdentifier: string | null; canManage: boolean; actor?: string | null }) {
  const { locale, dictionary } = useI18n();
  const t = accountSnapshotCopy[locale];
  const labels = dictionary.admin;
  const reviewLabels = labels.accountCategoryChangeRequestDetail;
  const rejectionLabels: Record<string, string> = reviewLabels.rejectionReasonLabels;
  const documentLabels: Record<string, string> = labels.accountDocuments.documentTypeLabels;
  const client = useQueryClient();
  const [code, setCode] = useState<RejectionCode>("other");
  const [reason, setReason] = useState("");
  const query = useQuery({ queryKey: [...adminQueryKeys.account.all(), "snapshotComparison", accountIdentifier, actor, requestId, locale, canManage], queryFn: () => fetchSnapshotComparison(requestId, locale), enabled: Boolean(accountIdentifier), retry: false });
  const mutation = useMutation({ mutationFn: (action: "approve" | "reject") => reviewSnapshotChange(requestId, locale, action === "reject" ? { rejectionReasonCode: code, rejectionReasonDetail: reason.trim() || null } : undefined), onSettled: async () => { await client.invalidateQueries({ queryKey: adminQueryKeys.account.all() }); } });
  const data = query.data;
  const busy = mutation.isPending || query.isFetching;
  const fields = { name: labels.accountNameLabel, email: labels.emailAddressLabel, type: reviewLabels.accountType, status: reviewLabels.accountStatus, phone: labels.accountPhoneLabel, countryCode: labels.accountAddressCountryCodeLabel, administrativeAreaCode: labels.accountAddressAdministrativeAreaCodeLabel, postalCode: labels.accountAddressPostalCodeLabel, locality: labels.accountAddressLocalityLabel, addressLine1: labels.accountAddressLine1Label, addressLine2: labels.accountAddressLine2Label };
  return <AccountSettingsPanel title={t.detail}><div className="mt-4 grid gap-4">
    {query.isLoading ? <p>{labels.accountSettingsLoading}</p> : null}
    {query.error ? <AccountStatusMessage variant="error">{t.error}</AccountStatusMessage> : null}
    {data ? <>
      <p>{t.status}: {t[`${data.request.status}Label`]}</p>
      <p className="whitespace-pre-wrap break-words">{t.reason}: {data.request.changeReason}</p>
      <p><LocalizedDateTime value={data.request.requestedAt} /></p>
      {data.request.rejectionReason ? <AccountStatusMessage variant="warning">{rejectionLabels[data.request.rejectionReason.code] ?? data.request.rejectionReason.code} {data.request.rejectionReason.detail}</AccountStatusMessage> : null}
      <div className="grid gap-4 lg:grid-cols-2">{(["original", "proposal"] as const).map((source) => <section className="min-w-0 rounded-lg border border-stroke-subtle p-4" key={source} aria-label={t[source]}><h3>{t[source]}</h3><dl className="mt-3 grid gap-2 break-words text-sm">{(Object.keys(fields) as (keyof typeof fields)[]).map((field) => <div key={field}><dt className="text-text-muted">{fields[field]}</dt><dd>{data[source].account[field] ?? "-"}</dd></div>)}</dl><h4 className="mt-4">{t.documents}</h4><ul>{data[source].documents.map((document) => <li key={document.documentType}><a className="underline" href={`/api/account/${snapshotRequestPath(data.request.requestIdentifier)}/documents/${encodeURIComponent(document.documentType)}?source=${source}`} target="_blank" rel="noopener noreferrer">{documentLabels[document.documentType] ?? document.documentType} / <LocalizedDateTime value={document.uploadedAt} /></a></li>)}</ul></section>)}</div>
      {canManage && data.request.status === "pending" && !query.isError ? <fieldset disabled={busy} className="grid gap-3"><legend>{t.review}</legend><button className={snapshotButtonClass} onClick={() => mutation.mutate("approve")} type="button">{reviewLabels.approve}</button><label className="grid gap-2">{reviewLabels.rejectionReasonCode}<select className="rounded border bg-surface-base p-2" value={code} onChange={(e) => setCode(e.currentTarget.value as RejectionCode)}>{snapshotSchemas.reviewBody.shape.rejectionReasonCode.options.map((value) => <option key={value} value={value}>{reviewLabels.rejectionReasonLabels[value]}</option>)}</select></label><label className="grid gap-2">{reviewLabels.rejectionReasonDetail}<textarea className="rounded border bg-surface-base p-2" value={reason} maxLength={2000} onChange={(e) => setReason(e.currentTarget.value)} /></label><button className={snapshotButtonClass} disabled={busy || (code === "other" && !reason.trim())} onClick={() => mutation.mutate("reject")} type="button">{reviewLabels.reject}</button></fieldset> : null}
    </> : null}
    {mutation.isSuccess && query.isError ? <AccountStatusMessage variant="warning">{t.refreshFailed}</AccountStatusMessage> : null}
    {mutation.error ? <AccountStatusMessage variant="error">{mutation.error.message}</AccountStatusMessage> : null}
    <button className={snapshotButtonClass} disabled={busy} onClick={() => void query.refetch()} type="button">{t.retry}</button>
  </div></AccountSettingsPanel>;
}

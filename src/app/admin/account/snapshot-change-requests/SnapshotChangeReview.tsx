"use client";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { AccountInformationDetails } from "../AccountInformationDetails";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { fetchSnapshotComparison, reviewSnapshotChange, snapshotSchemas, snapshotRequestPath } from "@/gateways/account/accountSnapshotApi";
import type { z } from "zod";
import { accountSnapshotCopy } from "@/i18n/accountSnapshot";
import { useI18n } from "@/i18n/I18nProvider";
import { adminQueryKeys } from "../../queryKeys";

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
  const client = useQueryClient();
  const [code, setCode] = useState<RejectionCode>("other");
  const [reason, setReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const query = useQuery({ queryKey: [...adminQueryKeys.account.all(), "snapshotComparison", accountIdentifier, actor, requestId, locale, canManage], queryFn: () => fetchSnapshotComparison(requestId, locale), enabled: Boolean(accountIdentifier), retry: false });
  const mutation = useMutation({ mutationFn: (action: "approve" | "reject") => reviewSnapshotChange(requestId, locale, action === "reject" ? { rejectionReasonCode: code, rejectionReasonDetail: reason.trim() || null } : undefined), onSuccess: () => { setRejectOpen(false); }, onSettled: async () => { await client.invalidateQueries({ queryKey: adminQueryKeys.account.all() }); } });
  const data = query.data;
  const busy = mutation.isPending || query.isFetching;
  const canReview = canManage && data?.request.status === "pending" && !query.isError;
  const canReject = canReview && !busy && (code !== "other" || Boolean(reason.trim()));
  return <Dialog.Root open={rejectOpen && Boolean(canReview)} onOpenChange={open => { if (!busy) setRejectOpen(open); }}>
    <AccountSettingsPanel
      title={t.reviewDetail}
      action={canManage ? <Link className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm font-semibold text-text-strong transition hover:border-brand-primary" href="/admin/account/snapshot-change-requests">{reviewLabels.backToList}</Link> : null}
    >
      <div className="mt-5 grid gap-5">
        {query.isLoading ? <AccountStatusMessage variant="loading">{labels.accountSettingsLoading}</AccountStatusMessage> : null}
        {query.error ? <AccountStatusMessage variant="error">{t.error}</AccountStatusMessage> : null}
        {data ? <>
          <section className="rounded-xl border border-stroke-subtle p-4">
            <h3 className="font-semibold text-text-strong">{reviewLabels.requestSection}</h3>
            <p className="mt-2 text-sm text-text-muted">{t[`${data.request.status}Label`]}</p>
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div><dt className="text-text-muted">{t.reason}</dt><dd className="whitespace-pre-wrap break-words">{data.request.changeReason}</dd></div>
              <div><dt className="text-text-muted">{labels.accountCategoryChangeRequests.requestedAt}</dt><dd><LocalizedDateTime value={data.request.requestedAt} /></dd></div>
              {data.request.rejectionReason ? <div><dt className="text-text-muted">{reviewLabels.rejectionReason}</dt><dd>{rejectionLabels[data.request.rejectionReason.code] ?? data.request.rejectionReason.code} {data.request.rejectionReason.detail}</dd></div> : null}
            </dl>
          </section>
          {(["original", "proposal"] as const).map(source => <section className="grid min-w-0 gap-4" key={source} aria-label={t[source]}>
            <h3 className="font-semibold text-text-strong">{t[source]}</h3>
            <AccountInformationDetails account={data[source].account} documents={data[source].documents.map(document => {
              const viewUrl = `/api/account/${snapshotRequestPath(data.request.requestIdentifier)}/documents/${encodeURIComponent(document.documentType)}?source=${source}`;
              return { ...document, viewUrl, downloadUrl: `${viewUrl}&download=1` };
            })} />
          </section>)}
          {canReview ? <div className="flex gap-3">
            <button className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60" disabled={busy} onClick={() => mutation.mutate("approve")} type="button">{reviewLabels.approve}</button>
            <Dialog.Trigger className="rounded-lg border border-stroke-subtle px-5 py-2.5 text-sm font-semibold text-text-strong disabled:opacity-60" disabled={busy}>{reviewLabels.reject}</Dialog.Trigger>
          </div> : null}
        </> : null}
        {mutation.isSuccess && query.isError ? <AccountStatusMessage variant="warning">{t.refreshFailed}</AccountStatusMessage> : null}
        {mutation.error && !rejectOpen ? <AccountStatusMessage variant="error">{mutation.error.message}</AccountStatusMessage> : null}
      </div>
    </AccountSettingsPanel>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl bg-surface-raised p-5 text-text-strong shadow-lg">
        <Dialog.Title className="font-semibold text-text-strong">{t.rejectTitle}</Dialog.Title>
        <label className="grid gap-2 text-sm">{reviewLabels.rejectionReasonCode}
          <select className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2" disabled={busy} value={code} onChange={event => setCode(event.currentTarget.value as RejectionCode)}>
            {snapshotSchemas.reviewBody.shape.rejectionReasonCode.options.map(value => <option key={value} value={value}>{reviewLabels.rejectionReasonLabels[value]}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">{reviewLabels.rejectionReasonDetail}
          <textarea className="min-h-24 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2" disabled={busy} value={reason} maxLength={2000} onChange={event => setReason(event.currentTarget.value)} />
        </label>
        {code === "other" && !reason.trim() ? <p className="text-sm text-status-danger">{reviewLabels.rejectionReasonDetailRequired}</p> : null}
        {mutation.error ? <AccountStatusMessage variant="error">{mutation.error.message}</AccountStatusMessage> : null}
        <div className="flex justify-end gap-3">
          <Dialog.Close className="rounded-lg border border-stroke-subtle px-4 py-2" disabled={busy}>{reviewLabels.cancel}</Dialog.Close>
          <button className="rounded-lg bg-brand-primary px-4 py-2 text-on-primary disabled:opacity-60" disabled={!canReject} onClick={() => mutation.mutate("reject")} type="button">{reviewLabels.submitReject}</button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

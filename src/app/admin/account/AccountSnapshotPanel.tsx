"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { requestAccountSnapshotChange, saveAccountSnapshot, snapshotSchemas } from "@/gateways/account/accountSnapshotApi";
import { isAccountBrowserApiError } from "@/gateways/account/accountBrowserApi";
import { useI18n } from "@/i18n/I18nProvider";
import { accountSnapshotCopy } from "@/i18n/accountSnapshot";
import { useAccountSnapshot } from "./useAccountSnapshot";
export const snapshotButtonClass = "w-fit rounded-lg border border-stroke-subtle px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50";
export function AccountSnapshotPanel(props: { accountIdentifier: string | null; canEdit: boolean; busy?: boolean }) {
  return <SnapshotPanel key={props.accountIdentifier} {...props} />;
}
function SnapshotPanel({ accountIdentifier, canEdit, busy = false }: { accountIdentifier: string | null; canEdit: boolean; busy?: boolean }) {
  const { locale } = useI18n();
  const t = accountSnapshotCopy[locale];
  const state = useAccountSnapshot(accountIdentifier);
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: async (action: "save" | "change") => action === "save" ? saveAccountSnapshot(accountIdentifier ?? "", locale) : requestAccountSnapshotChange(accountIdentifier ?? "", locale, { changeReason: reason.trim() }),
    onSettled: async () => { await state.refreshRelated(); },
  });
  const request = state.latest.data?.request;
  const currentSnapshot = state.current.data;
  const requiresApproval = state.latest.data?.changeRequiresApproval || (isAccountBrowserApiError(mutation.error) && mutation.error.accountRouteCode === "account_snapshot_change_requires_approval");
  const lastSaved = snapshotSchemas.summary.safeParse(mutation.data);
  const saved = mutation.isSuccess && mutation.variables === "save" && lastSaved.success ? lastSaved.data : state.current.data;
  const ready = canEdit && !busy && !state.editingLocked && state.current.isSuccess && !state.latest.isFetching && !state.current.isFetching && !mutation.isPending;
  return <AccountSettingsPanel title={t.title} description={t.preparation}>
    <div className="mt-4 grid gap-3">
      {state.current.isSuccess ? <p>{saved ? mutation.isSuccess && mutation.variables === "save" ? t.savedResult : t.saved : t.unsaved}</p> : null}
      {saved && "savedAt" in saved ? <dl className="grid gap-2 break-all text-sm"><div><dt>{t.identifier}</dt><dd>{saved.snapshotIdentifier}</dd></div><div><dt>{t.savedStatus}</dt><dd>{saved.status}</dd></div><div><dt>{t.savedAt}</dt><dd><LocalizedDateTime value={saved.savedAt} /></dd></div></dl> : null}
      {currentSnapshot ? <section aria-label={t.current} className="rounded border border-stroke-subtle p-3"><h3>{t.current}</h3><p className="break-all text-sm">{t.identifier}: {currentSnapshot.snapshotIdentifier}</p><p>{currentSnapshot.account.name}</p><p>{currentSnapshot.account.phone}</p><p>{[currentSnapshot.account.countryCode, currentSnapshot.account.administrativeAreaCode, currentSnapshot.account.postalCode, currentSnapshot.account.locality, currentSnapshot.account.addressLine1, currentSnapshot.account.addressLine2].filter(Boolean).join(" ")}</p><ul>{currentSnapshot.documents.map((document) => <li key={document.documentType}><a className="underline" href={`/api/account/accounts/${encodeURIComponent(currentSnapshot.accountIdentifier)}/snapshots/${encodeURIComponent(currentSnapshot.snapshotIdentifier)}/documents/${encodeURIComponent(document.documentType)}`}>{document.documentType}</a></li>)}</ul></section> : null}
      {state.current.error || state.latest.error ? <AccountStatusMessage variant="error">{t.error}</AccountStatusMessage> : null}
      {requiresApproval ? <p>{t.requiresApproval}</p> : null}
      {state.pending ? <AccountStatusMessage variant="warning">{t.pending}</AccountStatusMessage> : request?.status === "rejected" ? <AccountStatusMessage variant="warning">{t.rejected} {request.rejectionReason?.code} {request.rejectionReason?.detail}</AccountStatusMessage> : request?.status === "approved" ? <p>{t.approved}</p> : null}
      {request ? <><p>{request.changeReason}</p><Link href={`/admin/account/snapshot-change/${request.requestIdentifier}`}>{t.detail}</Link></> : null}
      <button className={snapshotButtonClass} disabled={!ready} onClick={() => mutation.mutate("save")} type="button">{t.save}</button>
      {requiresApproval && !state.pending ? <><p>{t.reasonHint}</p><label className="grid gap-2">{t.reason}<textarea className="rounded border border-stroke-subtle bg-surface-base p-2" maxLength={2000} disabled={!ready} value={reason} onChange={(e) => setReason(e.currentTarget.value)} /></label><button className={snapshotButtonClass} disabled={!ready || !state.current.data || !reason.trim()} onClick={() => mutation.mutate("change")} type="button">{t.submit}</button></> : null}
      {mutation.isSuccess && (state.current.isError || state.latest.isError) ? <AccountStatusMessage variant="warning">{t.refreshFailed}</AccountStatusMessage> : null}
      {mutation.error ? <AccountStatusMessage variant="error">{mutation.error.message}</AccountStatusMessage> : null}
      <button className={snapshotButtonClass} disabled={mutation.isPending || state.current.isFetching || state.latest.isFetching} onClick={() => void state.refreshRelated()} type="button">{t.retry}</button>
    </div>
  </AccountSettingsPanel>;
}

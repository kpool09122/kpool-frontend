"use client";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { requestAccountSnapshotChange, saveAccountSnapshot } from "@/gateways/account/accountSnapshotApi";
import { isAccountBrowserApiError } from "@/gateways/account/accountBrowserApi";
import { useI18n } from "@/i18n/I18nProvider";
import { accountSnapshotCopy } from "@/i18n/accountSnapshot";
import { AccountInformationDetails } from "./AccountInformationDetails";
import { useAccountSnapshot } from "./useAccountSnapshot";
export const snapshotButtonClass = "w-fit rounded-lg border border-stroke-subtle px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50";
export function AccountSnapshotPanel(props: { accountIdentifier: string | null; canEdit: boolean; busy?: boolean }) {
  return <SnapshotPanel key={props.accountIdentifier} {...props} />;
}
function SnapshotPanel({ accountIdentifier, canEdit, busy = false }: { accountIdentifier: string | null; canEdit: boolean; busy?: boolean }) {
  const { locale, dictionary } = useI18n();
  const t = accountSnapshotCopy[locale];
  const rejectionLabels: Record<string, string> = dictionary.admin.accountCategoryChangeRequestDetail.rejectionReasonLabels;
  const state = useAccountSnapshot(accountIdentifier);
  const [reason, setReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: async (action: "save" | "change") => action === "save" ? saveAccountSnapshot(accountIdentifier ?? "", locale) : requestAccountSnapshotChange(accountIdentifier ?? "", locale, { changeReason: reason.trim() }),
    onSuccess: (_data, action) => {
      if (action === "change") { setDialogOpen(false); setReason(""); }
    },
    onSettled: async () => { await state.refreshRelated(); },
  });
  const request = state.latest.data?.request;
  const currentSnapshot = state.current.data;
  const requiresApproval = state.latest.data?.changeRequiresApproval || (isAccountBrowserApiError(mutation.error) && mutation.error.accountRouteCode === "account_snapshot_change_requires_approval");
  const ready = canEdit && !busy && !state.snapshotLocked && state.current.isSuccess && !state.latest.isFetching && !state.current.isFetching && !mutation.isPending;
  const canRequestChange = ready && Boolean(currentSnapshot) && state.latest.data?.hasChanges === true;
  return <Dialog.Root open={dialogOpen && !state.snapshotLocked} onOpenChange={(open) => { if (!mutation.isPending) setDialogOpen(open); }}>
  <AccountSettingsPanel
    action={
      <Dialog.Trigger asChild>
      <button
        className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={requiresApproval ? !canRequestChange : !ready}
        onClick={(event) => {
          if (requiresApproval) { mutation.reset(); setDialogOpen(true); }
          else { event.preventDefault(); mutation.mutate("save"); }
        }}
        type="button"
      >
        {requiresApproval ? t.requestChange : t.save}
      </button>
      </Dialog.Trigger>
    }
    title={t.title}
    description={t.preparation}
  >
    <div className="mt-4 grid gap-3">
      {mutation.isSuccess && mutation.variables === "save" ? <AccountStatusMessage variant="success">{t.saved}</AccountStatusMessage> : state.current.isSuccess && !currentSnapshot ? <p>{t.unsaved}</p> : null}
      {currentSnapshot ? <section aria-label={t.current} className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-text-strong">{t.current}</h3>
          <p className="text-sm text-text-muted">{t.savedAt}: <LocalizedDateTime value={currentSnapshot.savedAt} /></p>
        </div>
        <AccountInformationDetails account={currentSnapshot.account} documents={currentSnapshot.documents.map(document => {
          const viewUrl = `/api/account/accounts/${encodeURIComponent(currentSnapshot.accountIdentifier)}/snapshots/${encodeURIComponent(currentSnapshot.snapshotIdentifier)}/documents/${encodeURIComponent(document.documentType)}`;
          return { ...document, viewUrl, downloadUrl: `${viewUrl}?download=1` };
        })} />
      </section> : null}
      {state.current.error || state.latest.error ? <AccountStatusMessage variant="error">{t.error}</AccountStatusMessage> : null}
      {state.latest.data?.categoryChangePending ? <AccountStatusMessage variant="warning">{t.categoryChangePending}</AccountStatusMessage> : null}
      {state.pending ? <AccountStatusMessage variant="warning">{t.pending}</AccountStatusMessage> : request?.status === "rejected" ? <AccountStatusMessage variant="warning">{t.rejected} {request.rejectionReason ? rejectionLabels[request.rejectionReason.code] ?? request.rejectionReason.code : null} {request.rejectionReason?.detail}</AccountStatusMessage> : request?.status === "approved" ? <p>{t.approved}</p> : null}
      {mutation.isSuccess && (state.current.isError || state.latest.isError) ? <AccountStatusMessage variant="warning">{t.refreshFailed}</AccountStatusMessage> : null}
      {mutation.error && !dialogOpen ? <AccountStatusMessage variant="error">{mutation.error.message}</AccountStatusMessage> : null}
    </div>
  </AccountSettingsPanel>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-stroke-subtle bg-surface-raised p-6 text-text-strong shadow-xl">
      <Dialog.Title className="text-xl font-semibold">{t.requestChange}</Dialog.Title>
      <Dialog.Description className="mt-2 text-sm leading-6 text-text-muted">{t.reasonHint}</Dialog.Description>
      <form className="mt-5 grid gap-4" onSubmit={(event) => {
        event.preventDefault();
        if (canRequestChange && reason.trim()) mutation.mutate("change");
      }}>
        <label className="grid gap-2 text-sm font-semibold">
          {t.reason}
          <textarea className="min-h-28 rounded-lg border border-stroke-subtle bg-surface-base p-3" maxLength={2000} required disabled={mutation.isPending} value={reason} onChange={(event) => setReason(event.currentTarget.value)} />
        </label>
        {mutation.error ? <AccountStatusMessage variant="error">{mutation.error.message}</AccountStatusMessage> : null}
        <div className="flex justify-end gap-3">
          <Dialog.Close type="button" className={snapshotButtonClass} disabled={mutation.isPending}>{dictionary.admin.accountCategoryChangeRequestDetail.cancel}</Dialog.Close>
          <button className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" disabled={!canRequestChange || !reason.trim()} type="submit">{t.requestChange}</button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
  </Dialog.Root>;
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PrincipalStatusField } from "@/components/PrincipalStatusField";
import type { PrincipalStatus } from "@/gateways/identity/principalStatus";
import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { PrincipalGroupMembershipOption } from "@/components/PrincipalGroupMembershipOption";
import {
  getSiteManagementEditableGroups,
  getSiteManagementUserDisplayName,
  getSiteManagementUserGroupIdentifiers,
} from "./membershipModel";
import type {
  SiteManagementDictionary, SiteManagementGroup, SiteManagementPrincipalGroupActions,
  SiteManagementPrincipalGroupState, SiteManagementUser,
} from "./types";

type UserDialogDraft = { userIdentifier: string; selectedGroupIdentifiers: string[]; status: PrincipalStatus };

/** Controlled page draft + local dialog draft. Connect callbacks from a client hook (#448). */
export function SiteManagementPrincipalGroupManagementPanel({ state, actions, t }: {
  state: SiteManagementPrincipalGroupState;
  actions: SiteManagementPrincipalGroupActions;
  t: SiteManagementDictionary;
}) {
  const [dialogDraft, setDialogDraft] = useState<UserDialogDraft | null>(null);
  const groups = getSiteManagementEditableGroups(state.groups);
  const busy = state.isLoading || state.isSaving;
  const disabled = busy || !state.canManage || Boolean(state.loadError) || groups.length === 0;
  const saveDisabled = disabled || !(state.hasUnsavedChanges && !state.canRetryRefresh);
  const dialogUser = state.users.find((user) => user.principalIdentifier === dialogDraft?.userIdentifier);
  const save = () => { if (!saveDisabled) actions.save(); };
  const currentEditableIdentifiers = dialogUser
    ? getSiteManagementUserGroupIdentifiers(state.membershipByGroup, dialogUser.principalIdentifier)
      .filter((identifier) => groups.some((group) => group.principalGroupIdentifier === identifier))
    : [];
  const dialogHasChanges = Boolean(dialogDraft && (
    dialogDraft.status !== dialogUser?.status ||
    dialogDraft.selectedGroupIdentifiers.length !== currentEditableIdentifiers.length ||
    dialogDraft.selectedGroupIdentifiers.some((identifier) => !currentEditableIdentifiers.includes(identifier))
  ));
  const confirm = () => {
    if (disabled || !dialogDraft || !dialogUser) return;
    const current = getSiteManagementUserGroupIdentifiers(state.membershipByGroup, dialogUser.principalIdentifier);
    const editable = new Set(groups.map((group) => group.principalGroupIdentifier));
    const selected = dialogDraft.selectedGroupIdentifiers.filter((identifier) => editable.has(identifier));
    const previous = current.filter((identifier) => editable.has(identifier));
    if (selected.length !== previous.length || selected.some((identifier) => !previous.includes(identifier))) {
      actions.updateUserGroups(dialogUser.principalIdentifier, selected);
    }
    if (dialogDraft.status !== "forced_stop" && dialogDraft.status !== dialogUser.status) actions.updateUserStatus(dialogUser.principalIdentifier, dialogDraft.status);
    setDialogDraft(null);
  };

  return (
    <AccountSettingsPanel title={t.title} description={t.description} action={
      <button className="rounded-lg bg-brand-primary px-5 py-2 text-on-primary disabled:opacity-60" disabled={saveDisabled} onClick={save} type="button">
        {state.isSaving ? t.saving : t.save}
      </button>
    }>
      <div className="mt-5 grid gap-3">
        {state.isLoading ? <AccountStatusMessage variant="loading">{t.loading}</AccountStatusMessage> : null}
        {!busy && !state.canManage && !state.canRetryRefresh ? <AccountStatusMessage variant="warning">{t.readOnly}</AccountStatusMessage> : null}
        {state.loadError ? <AccountStatusMessage variant="error">{state.loadError}</AccountStatusMessage> : null}
        {!state.isLoading && !state.loadError && groups.length === 0 ? <AccountStatusMessage variant="empty">{t.noGroups}</AccountStatusMessage> : null}
        <div aria-label={t.userList} className="grid gap-3">
          {!state.isLoading && !state.loadError && state.users.length === 0 ? <AccountStatusMessage variant="empty">{t.noUsers}</AccountStatusMessage> : null}
          {state.users.map((user) => {
            const selected = new Set(getSiteManagementUserGroupIdentifiers(state.membershipByGroup, user.principalIdentifier));
            const names = state.groups.filter((group) => selected.has(group.principalGroupIdentifier)).map((group) => group.name);
            return <article className="rounded-xl border border-stroke-subtle bg-surface-raised p-4" key={user.principalIdentifier}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="break-all font-semibold">{getSiteManagementUserDisplayName(user)}</h3><p className="break-all text-xs text-text-muted">{user.email}</p><p className="mt-2 text-sm">{t.principalStatus[user.status]}</p>{user.status === "forced_stop" ? <p className="text-sm text-text-muted">{t.principalStatus.forcedReason}</p> : null}</div>
                <button className="rounded-lg border border-stroke-subtle px-4 py-2 disabled:opacity-60" disabled={disabled} onClick={() => {
                  if (!disabled) setDialogDraft({ status: user.status, userIdentifier: user.principalIdentifier, selectedGroupIdentifiers: groups.filter((group) => selected.has(group.principalGroupIdentifier)).map((group) => group.principalGroupIdentifier) });
                }} type="button">{t.edit}</button>
              </div>
              <p className="mt-3 text-sm text-text-muted"><span className="font-semibold">{t.userGroups}</span> <span>{names.length ? names.join(", ") : t.unassigned}</span></p>
            </article>;
          })}
        </div>
        {state.hasUnsavedChanges ? <AccountStatusMessage variant="warning">{t.unsaved}</AccountStatusMessage> : null}
        {state.saveError ? <AccountStatusMessage variant="error" action={
          <button className="mt-3 rounded-lg border px-4 py-2 disabled:opacity-60" disabled={saveDisabled} onClick={save} type="button">{t.retrySave}</button>
        }>{state.saveError}</AccountStatusMessage> : null}
        {state.success ? <AccountStatusMessage variant="success">{state.success}</AccountStatusMessage> : null}
      </div>
      {dialogDraft && dialogUser ? <EditUserGroupsDialog
        key={dialogDraft.userIdentifier} user={dialogUser} groups={groups} selected={dialogDraft.selectedGroupIdentifiers}
        status={dialogDraft.status} onStatus={(status) => setDialogDraft({ ...dialogDraft, status })}
        disabled={disabled} confirmDisabled={disabled || !dialogHasChanges} t={t} onCancel={() => setDialogDraft(null)} onConfirm={confirm}
        onToggle={(identifier) => {
          if (disabled) return;
          setDialogDraft({ ...dialogDraft, selectedGroupIdentifiers: dialogDraft.selectedGroupIdentifiers.includes(identifier)
            ? dialogDraft.selectedGroupIdentifiers.filter((candidate) => candidate !== identifier)
            : [...dialogDraft.selectedGroupIdentifiers, identifier] });
        }}
      /> : null}
    </AccountSettingsPanel>
  );
}

function EditUserGroupsDialog({ status, onStatus, user, groups, selected, disabled, confirmDisabled, t, onCancel, onConfirm, onToggle }: {
  status: PrincipalStatus;
  onStatus: (status: "active" | "suspended") => void;
  user: SiteManagementUser;
  groups: readonly SiteManagementGroup[];
  selected: string[];
  disabled: boolean;
  confirmDisabled: boolean;
  t: SiteManagementDictionary;
  onCancel: () => void;
  onConfirm: () => void;
  onToggle: (identifier: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => { dialog?.close?.(); opener?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} aria-describedby={descriptionId} aria-modal="true"
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl bg-surface-raised p-6 text-text-strong shadow-xl backdrop:bg-black/40">
    <h3 id={titleId} className="break-all text-lg font-semibold">{t.dialogTitle(getSiteManagementUserDisplayName(user))}</h3>
    <p id={descriptionId} className="mt-2 text-sm text-text-muted">{t.dialogDescription}</p>
    <PrincipalStatusField value={status} disabled={disabled} onChange={onStatus} t={t.principalStatus} />
    <fieldset className="mt-5 grid gap-3" disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold">{t.checkboxList}</legend>
      {groups.map((group) => <PrincipalGroupMembershipOption key={group.principalGroupIdentifier} name={group.name}
        description={group.description} checked={selected.includes(group.principalGroupIdentifier)} disabled={disabled}
        onChange={() => onToggle(group.principalGroupIdentifier)} />)}
    </fieldset>
    <div className="mt-6 flex justify-end gap-3">
      <button className="rounded-lg border px-4 py-2" onClick={onCancel} type="button">{t.cancel}</button>
      <button className="rounded-lg bg-brand-primary px-4 py-2 text-on-primary disabled:opacity-60" disabled={confirmDisabled} onClick={onConfirm} type="button">{t.confirm}</button>
    </div>
  </dialog>;
}

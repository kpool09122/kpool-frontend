"use client";

import { useMemo, useState } from "react";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import type { AccountMemberSummary, PrincipalGroupSummary } from "@/gateways/account/accountApi";
import type { useI18n } from "../../../../i18n/I18nProvider";
import {
  getMemberDisplayName,
  getUserGroupIdentifiers,
  type useAccountPrincipalGroups,
} from "./useAccountPrincipalGroups";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];

type EditableMemberDialogState = {
  member: AccountMemberSummary;
  selectedGroupIdentifiers: string[];
} | null;

export function PrincipalGroupManagementPanel({
  canManage,
  principalGroups,
  t,
}: {
  canManage: boolean;
  principalGroups: ReturnType<typeof useAccountPrincipalGroups>;
  t: AdminDictionary;
}) {
  const {
    hasUnsavedChanges,
    isBusy,
    state,
    load,
    save,
    updateUserGroups,
  } = principalGroups;
  const [dialogState, setDialogState] = useState<EditableMemberDialogState>(null);

  const openMemberDialog = (member: AccountMemberSummary) => {
    setDialogState({
      member,
      selectedGroupIdentifiers: getUserGroupIdentifiers(
        state.membershipByGroup,
        member.principalIdentifier,
      ),
    });
  };

  const confirmMemberDialog = () => {
    if (!dialogState) {
      return;
    }

    updateUserGroups(
      dialogState.member.principalIdentifier,
      dialogState.selectedGroupIdentifiers,
    );
    setDialogState(null);
  };

  return (
    <AccountSettingsPanel
      action={
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isBusy || !canManage || !hasUnsavedChanges || state.groups.length === 0}
          onClick={save}
          type="button"
        >
          {state.isSaving ? t.principalGroupSaving : t.principalGroupSave}
        </button>
      }
      description={t.principalGroupManagementDescription}
      title={t.principalGroupManagementTitle}
    >
      {state.isLoading ? (
        <AccountStatusMessage className="mt-5" variant="loading">
          {t.principalGroupLoading}
        </AccountStatusMessage>
      ) : null}
      {!state.isLoading && state.groups.length === 0 ? (
        <AccountStatusMessage className="mt-5" variant="empty">
          {t.principalGroupEmpty}
        </AccountStatusMessage>
      ) : null}
      {!canManage ? (
        <AccountStatusMessage className="mt-5" variant="warning">
          {t.principalGroupReadOnly}
        </AccountStatusMessage>
      ) : null}
      <div aria-label={t.principalGroupUserListLabel} className="mt-5 grid gap-3">
        {state.members.length === 0 && !state.isLoading ? (
          <AccountStatusMessage variant="empty">
            {t.principalGroupNoUsers}
          </AccountStatusMessage>
        ) : null}
        {state.members.map((member) => (
          <PrincipalMemberRow
            disabled={isBusy || !canManage}
            groups={state.groups}
            key={member.principalIdentifier}
            member={member}
            membershipByGroup={state.membershipByGroup}
            onEdit={() => openMemberDialog(member)}
            t={t}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-3">
        {hasUnsavedChanges ? (
          <AccountStatusMessage variant="warning">
            {t.principalGroupUnsavedChanges}
          </AccountStatusMessage>
        ) : null}
        {state.error ? (
          <AccountStatusMessage
            action={
              <button
                className="mt-3 rounded-lg border border-red-300 px-4 py-2 transition hover:bg-red-100"
                onClick={load}
                type="button"
              >
                {t.principalGroupRetry}
              </button>
            }
            variant="error"
          >
            {state.error}
          </AccountStatusMessage>
        ) : null}
        {state.success ? (
          <AccountStatusMessage variant="success">
            {state.success}
          </AccountStatusMessage>
        ) : null}
      </div>
      <EditMemberGroupsDialog
        dialogState={dialogState}
        groups={state.groups}
        isBusy={isBusy}
        onConfirm={confirmMemberDialog}
        setDialogState={setDialogState}
        t={t}
      />
    </AccountSettingsPanel>
  );
}

function PrincipalMemberRow({
  disabled,
  groups,
  member,
  membershipByGroup,
  onEdit,
  t,
}: {
  disabled: boolean;
  groups: PrincipalGroupSummary[];
  member: AccountMemberSummary;
  membershipByGroup: Record<string, string[]>;
  onEdit: () => void;
  t: AdminDictionary;
}) {
  const groupNames = useMemo(() => {
    const selectedGroupIdentifiers = new Set(
      getUserGroupIdentifiers(membershipByGroup, member.principalIdentifier),
    );

    return groups
      .filter((group) => selectedGroupIdentifiers.has(group.principalGroupIdentifier))
      .map((group) => group.name);
  }, [groups, member.principalIdentifier, membershipByGroup]);

  return (
    <article className="rounded-xl border border-stroke-subtle bg-surface-raised p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-strong">{getMemberDisplayName(member)}</h3>
          <p className="mt-1 break-all text-xs text-text-muted">{member.email}</p>
        </div>
        <button
          className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-surface-base disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onEdit}
          type="button"
        >
          {t.principalGroupEditUserGroups}
        </button>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        <span className="font-semibold text-text-strong">{t.principalGroupUserGroupsLabel}</span>{" "}
        {groupNames.length > 0 ? groupNames.join(", ") : t.principalGroupNoSelectedGroups}
      </p>
    </article>
  );
}

function EditMemberGroupsDialog({
  dialogState,
  groups,
  isBusy,
  onConfirm,
  setDialogState,
  t,
}: {
  dialogState: EditableMemberDialogState;
  groups: PrincipalGroupSummary[];
  isBusy: boolean;
  onConfirm: () => void;
  setDialogState: (state: EditableMemberDialogState) => void;
  t: AdminDictionary;
}) {
  if (!dialogState) {
    return null;
  }

  const selectedGroupIdentifiers = new Set(dialogState.selectedGroupIdentifiers);
  const toggleGroup = (groupIdentifier: string) => {
    const nextGroupIdentifiers = selectedGroupIdentifiers.has(groupIdentifier)
      ? dialogState.selectedGroupIdentifiers.filter((candidate) => candidate !== groupIdentifier)
      : [...dialogState.selectedGroupIdentifiers, groupIdentifier];

    setDialogState({
      ...dialogState,
      selectedGroupIdentifiers: nextGroupIdentifiers,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-surface-raised p-6 shadow-xl"
        role="dialog"
      >
        <h3 className="text-lg font-semibold text-text-strong">
          {t.principalGroupDialogTitle(getMemberDisplayName(dialogState.member))}
        </h3>
        <p className="mt-2 text-sm leading-7 text-text-muted">
          {t.principalGroupDialogDescription}
        </p>
        <fieldset className="mt-5 grid gap-3">
          <legend className="text-sm font-semibold text-text-strong">
            {t.principalGroupCheckboxListLabel}
          </legend>
          {groups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stroke-subtle p-4 text-sm text-text-muted">
              {t.principalGroupNoGroups}
            </p>
          ) : groups.map((group) => (
            <label
              className="flex items-center gap-3 rounded-lg border border-stroke-subtle bg-surface-base p-3 text-sm font-semibold"
              key={group.principalGroupIdentifier}
            >
              <input
                checked={selectedGroupIdentifiers.has(group.principalGroupIdentifier)}
                className="size-4"
                disabled={isBusy}
                onChange={() => toggleGroup(group.principalGroupIdentifier)}
                type="checkbox"
              />
              <span>{group.name}</span>
            </label>
          ))}
        </fieldset>
        <p className="mt-4 text-sm text-text-muted">
          {t.principalGroupSelectedCount(dialogState.selectedGroupIdentifiers.length)}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-surface-base"
            onClick={() => setDialogState(null)}
            type="button"
          >
            {t.principalGroupDialogCancel}
          </button>
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onConfirm}
            type="button"
          >
            {t.principalGroupDialogConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

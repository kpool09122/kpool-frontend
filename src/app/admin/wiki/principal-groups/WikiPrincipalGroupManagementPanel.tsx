"use client";

import { useMemo, useState } from "react";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import type { useI18n } from "../../../../i18n/I18nProvider";
import type { WikiPrincipalGroupMemberSummary, WikiPrincipalGroupSummary } from "@/gateways/wiki/wikiPrincipalGroups";
import {
  getUserDisplayName,
  getUserGroupIdentifiers,
  type useWikiPrincipalGroups,
} from "./useWikiPrincipalGroups";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];

type EditableUserDialogState = {
  selectedGroupIdentifiers: string[];
  user: WikiPrincipalGroupMemberSummary;
} | null;

export function WikiPrincipalGroupManagementPanel({
  canManage,
  principalGroups,
  t,
}: {
  canManage: boolean;
  principalGroups: ReturnType<typeof useWikiPrincipalGroups>;
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
  const [dialogState, setDialogState] = useState<EditableUserDialogState>(null);

  const openUserDialog = (user: WikiPrincipalGroupMemberSummary) => {
    setDialogState({
      selectedGroupIdentifiers: getUserGroupIdentifiers(state.membershipByGroup, user.principalIdentifier),
      user,
    });
  };

  const confirmUserDialog = () => {
    if (!dialogState) {
      return;
    }

    updateUserGroups(dialogState.user.principalIdentifier, dialogState.selectedGroupIdentifiers);
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
          {state.isSaving ? t.wikiPrincipalGroupSaving : t.wikiPrincipalGroupSave}
        </button>
      }
      description={t.wikiPrincipalGroupManagementDescription}
      title={t.wikiPrincipalGroupManagementTitle}
    >
      {state.isLoading ? (
        <AccountStatusMessage className="mt-5" variant="loading">
          {t.wikiPrincipalGroupLoading}
        </AccountStatusMessage>
      ) : null}
      {!state.isLoading && state.groups.length === 0 ? (
        <AccountStatusMessage className="mt-5" variant="empty">
          {t.wikiPrincipalGroupEmpty}
        </AccountStatusMessage>
      ) : null}
      {!canManage ? (
        <AccountStatusMessage className="mt-5" variant="warning">
          {t.wikiPrincipalGroupReadOnly}
        </AccountStatusMessage>
      ) : null}
      <div aria-label={t.wikiPrincipalGroupUserListLabel} className="mt-5 grid gap-3">
        {state.users.length === 0 && !state.isLoading ? (
          <AccountStatusMessage variant="empty">
            {t.wikiPrincipalGroupNoUsers}
          </AccountStatusMessage>
        ) : null}
        {state.users.map((user) => (
          <WikiPrincipalUserRow
            disabled={isBusy || !canManage}
            groups={state.groups}
            key={user.principalIdentifier}
            membershipByGroup={state.membershipByGroup}
            onEdit={() => openUserDialog(user)}
            t={t}
            user={user}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-3">
        {hasUnsavedChanges ? (
          <AccountStatusMessage variant="warning">
            {t.wikiPrincipalGroupUnsavedChanges}
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
                {t.wikiPrincipalGroupRetry}
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
      <EditUserGroupsDialog
        dialogState={dialogState}
        groups={state.groups}
        isBusy={isBusy}
        setDialogState={setDialogState}
        t={t}
        onConfirm={confirmUserDialog}
      />
    </AccountSettingsPanel>
  );
}

function WikiPrincipalUserRow({
  disabled,
  groups,
  membershipByGroup,
  onEdit,
  t,
  user,
}: {
  disabled: boolean;
  groups: WikiPrincipalGroupSummary[];
  membershipByGroup: Record<string, string[]>;
  onEdit: () => void;
  t: AdminDictionary;
  user: WikiPrincipalGroupMemberSummary;
}) {
  const groupNames = useMemo(() => {
    const selectedGroupIdentifiers = new Set(
      getUserGroupIdentifiers(membershipByGroup, user.principalIdentifier),
    );

    return groups
      .filter((group) => selectedGroupIdentifiers.has(group.principalGroupIdentifier))
      .map((group) => group.name);
  }, [groups, membershipByGroup, user.principalIdentifier]);

  return (
    <article className="rounded-xl border border-stroke-subtle bg-surface-raised p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-strong">{getUserDisplayName(user)}</h3>
          <p className="mt-1 break-all text-xs text-text-muted">{user.email}</p>
        </div>
        <button
          className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-surface-base disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onEdit}
          type="button"
        >
          {t.wikiPrincipalGroupEditUserGroups}
        </button>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        <span className="font-semibold text-text-strong">{t.wikiPrincipalGroupUserGroupsLabel}</span>{" "}
        {groupNames.length > 0 ? groupNames.join(", ") : t.wikiPrincipalGroupNoSelectedGroups}
      </p>
    </article>
  );
}

function EditUserGroupsDialog({
  dialogState,
  groups,
  isBusy,
  setDialogState,
  t,
  onConfirm,
}: {
  dialogState: EditableUserDialogState;
  groups: WikiPrincipalGroupSummary[];
  isBusy: boolean;
  setDialogState: (state: EditableUserDialogState) => void;
  t: AdminDictionary;
  onConfirm: () => void;
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
      <div aria-modal="true" className="w-full max-w-lg rounded-2xl bg-surface-raised p-6 shadow-xl" role="dialog">
        <h3 className="text-lg font-semibold text-text-strong">
          {t.wikiPrincipalGroupDialogTitle(getUserDisplayName(dialogState.user))}
        </h3>
        <p className="mt-2 text-sm leading-7 text-text-muted">
          {t.wikiPrincipalGroupDialogDescription}
        </p>
        <fieldset className="mt-5 grid gap-3">
          <legend className="text-sm font-semibold text-text-strong">
            {t.wikiPrincipalGroupCheckboxListLabel}
          </legend>
          {groups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stroke-subtle p-4 text-sm text-text-muted">
              {t.wikiPrincipalGroupNoGroups}
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
          {t.wikiPrincipalGroupSelectedCount(dialogState.selectedGroupIdentifiers.length)}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-surface-base"
            onClick={() => setDialogState(null)}
            type="button"
          >
            {t.wikiPrincipalGroupDialogCancel}
          </button>
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onConfirm}
            type="button"
          >
            {t.wikiPrincipalGroupDialogConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

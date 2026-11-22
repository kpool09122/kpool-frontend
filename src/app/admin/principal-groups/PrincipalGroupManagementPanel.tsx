"use client";

import { PrincipalStatusToggle } from "@/components/PrincipalStatusToggle";
import { PrincipalGroupMembershipOption } from "@/components/PrincipalGroupMembershipOption";

import { useMemo, useState } from "react";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import type { useI18n } from "@/i18n/I18nProvider";
import type { PrincipalStatus } from "@/gateways/identity/principalStatus";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];
export type PrincipalGroupPanelUser = {
  principalIdentifier: string;
  identityName: string;
  email: string;
  status: PrincipalStatus;
};
export type PrincipalGroupPanelGroup = {
  principalGroupIdentifier: string;
  name: string;
  description?: string | null;
  isMembershipEditable?: boolean;
};
export type PrincipalGroupPanelModel = {
  hasUnsavedChanges: boolean;
  isBusy: boolean;
  state: {
    groups: PrincipalGroupPanelGroup[];
    users: PrincipalGroupPanelUser[];
    membershipByGroup: Readonly<Record<string, readonly string[]>>;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    loadError?: string | null;
    canRetryRefresh?: boolean;
    success: string | null;
  };
  load: () => void;
  save: () => void;
  updateUserGroups: (id: string, groups: string[]) => void;
  updateUserStatus: (id: string, status: "active" | "suspended") => void;
};

export const getPrincipalGroupPanelText = (t: AdminDictionary) => ({
  saving: t.wikiPrincipalGroupSaving,
  save: t.wikiPrincipalGroupSave,
  managementDescription: t.wikiPrincipalGroupManagementDescription,
  managementTitle: t.wikiPrincipalGroupManagementTitle,
  loading: t.wikiPrincipalGroupLoading,
  empty: t.wikiPrincipalGroupEmpty,
  readOnly: t.wikiPrincipalGroupReadOnly,
  userListLabel: t.wikiPrincipalGroupUserListLabel,
  noUsers: t.wikiPrincipalGroupNoUsers,
  unsavedChanges: t.wikiPrincipalGroupUnsavedChanges,
  retry: t.wikiPrincipalGroupRetry,
  editUserGroups: t.wikiPrincipalGroupEditUserGroups,
  userGroupsLabel: t.wikiPrincipalGroupUserGroupsLabel,
  noSelectedGroups: t.wikiPrincipalGroupNoSelectedGroups,
  dialogTitle: t.wikiPrincipalGroupDialogTitle,
  dialogDescription: t.wikiPrincipalGroupDialogDescription,
  checkboxListLabel: t.wikiPrincipalGroupCheckboxListLabel,
  noGroups: t.wikiPrincipalGroupNoGroups,
  selectedCount: t.wikiPrincipalGroupSelectedCount,
  dialogCancel: t.wikiPrincipalGroupDialogCancel,
  dialogConfirm: t.wikiPrincipalGroupDialogConfirm,
  principalStatus: t.principalStatus,
});

type PanelText = ReturnType<typeof getPrincipalGroupPanelText>;

const getUserDisplayName = (user: PrincipalGroupPanelUser) =>
  user.identityName.trim() || user.email || user.principalIdentifier;
const getUserGroupIdentifiers = (
  memberships: Readonly<Record<string, readonly string[]>>,
  id: string,
) => Object.entries(memberships).filter(([, members]) => members.includes(id)).map(([group]) => group);

type EditableUserDialogState = {
  selectedGroupIdentifiers: string[];
  user: PrincipalGroupPanelUser;
} | null;

export function PrincipalGroupManagementPanel({
  canManage,
  principalGroups,
  t,
}: {
  canManage: boolean;
  principalGroups: PrincipalGroupPanelModel;
  t: PanelText;
}) {
  const {
    hasUnsavedChanges,
    isBusy,
    state,
    load,
    save,
    updateUserGroups,
    updateUserStatus,
  } = principalGroups;
  const [dialogState, setDialogState] = useState<EditableUserDialogState>(null);

  const openUserDialog = (user: PrincipalGroupPanelUser) => {
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
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isBusy || !canManage || !hasUnsavedChanges || state.groups.length === 0}
          onClick={save}
          type="button"
        >
          {state.isSaving ? t.saving : t.save}
        </button>
      }
      description={t.managementDescription}
      title={t.managementTitle}
    >
      {state.isLoading ? (
        <AccountStatusMessage className="mt-5" variant="loading">
          {t.loading}
        </AccountStatusMessage>
      ) : null}
      {!state.isLoading && state.groups.length === 0 ? (
        <AccountStatusMessage className="mt-5" variant="empty">
          {t.empty}
        </AccountStatusMessage>
      ) : null}
      {!canManage ? (
        <AccountStatusMessage className="mt-5" variant="warning">
          {t.readOnly}
        </AccountStatusMessage>
      ) : null}
      <div aria-label={t.userListLabel} className="mt-5 grid gap-3">
        {state.users.length === 0 && !state.isLoading ? (
          <AccountStatusMessage variant="empty">
            {t.noUsers}
          </AccountStatusMessage>
        ) : null}
        {state.users.map((user) => (
          <PrincipalUserRow
            disabled={isBusy || !canManage}
            groups={state.groups}
            key={user.principalIdentifier}
            membershipByGroup={state.membershipByGroup}
            onStatusChange={(status) => updateUserStatus(user.principalIdentifier, status)}
            onEdit={() => openUserDialog(user)}
            t={t}
            user={user}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-3">
        {hasUnsavedChanges ? (
          <AccountStatusMessage variant="warning">
            {t.unsavedChanges}
          </AccountStatusMessage>
        ) : null}
        {state.error || state.canRetryRefresh ? (
          <AccountStatusMessage
            action={
              <button
                className="mt-3 rounded-lg border border-status-danger px-4 py-2 transition hover:bg-status-danger/10"
                onClick={state.canRetryRefresh || state.loadError ? load : save}
                type="button"
              >
                {t.retry}
              </button>
            }
            variant="error"
          >
            {state.error ?? t.principalStatus.savedRefreshFailed}
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
        isBusy={isBusy || !canManage}
        setDialogState={setDialogState}
        t={t}
        onConfirm={confirmUserDialog}
      />
    </AccountSettingsPanel>
  );
}

function PrincipalUserRow({
  disabled,
  groups,
  membershipByGroup,
  onEdit,
  onStatusChange,
  t,
  user,
}: {
  disabled: boolean;
  groups: PrincipalGroupPanelGroup[];
  membershipByGroup: Readonly<Record<string, readonly string[]>>;
  onEdit: () => void;
  onStatusChange: (status: "active" | "suspended") => void;
  t: PanelText;
  user: PrincipalGroupPanelUser;
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
          {user.status === "forced_stop" ? <p className="text-sm text-text-muted">{t.principalStatus.forcedReason}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PrincipalStatusToggle value={user.status} disabled={disabled} onChange={onStatusChange} t={t.principalStatus} />
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-surface-base disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            onClick={onEdit}
            type="button"
          >
            {t.editUserGroups}
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        <span className="font-semibold text-text-strong">{t.userGroupsLabel}</span>{" "}
        {groupNames.length > 0 ? groupNames.join(", ") : t.noSelectedGroups}
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
  groups: PrincipalGroupPanelGroup[];
  isBusy: boolean;
  setDialogState: (state: EditableUserDialogState) => void;
  t: PanelText;
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
          {t.dialogTitle(getUserDisplayName(dialogState.user))}
        </h3>
        <p className="mt-2 text-sm leading-7 text-text-muted">
          {t.dialogDescription}
        </p>
        <fieldset className="mt-5 grid gap-3">
          <legend className="mb-3 text-sm font-semibold text-text-strong">
            {t.checkboxListLabel}
          </legend>
          {groups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stroke-subtle p-4 text-sm text-text-muted">
              {t.noGroups}
            </p>
          ) : groups.map((group) => (
            <PrincipalGroupMembershipOption
              key={group.principalGroupIdentifier}
              name={group.name}
              description={group.description}
              checked={selectedGroupIdentifiers.has(group.principalGroupIdentifier)}
              disabled={isBusy || group.isMembershipEditable === false}
              onChange={() => toggleGroup(group.principalGroupIdentifier)}
            />
          ))}
        </fieldset>
        <p className="mt-4 text-sm text-text-muted">
          {t.selectedCount(dialogState.selectedGroupIdentifiers.length)}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-surface-base"
            onClick={() => setDialogState(null)}
            type="button"
          >
            {t.dialogCancel}
          </button>
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onConfirm}
            type="button"
          >
            {t.dialogConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

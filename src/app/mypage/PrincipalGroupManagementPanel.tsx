"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchAccountMembers,
  fetchPrincipalGroups,
  isAccountBrowserApiError,
  updatePrincipalGroupMembers,
} from "@/gateways/account/accountBrowserApi";
import type { AccountMemberSummary, PrincipalGroupSummary } from "@/gateways/account/accountApi";
import type { useI18n } from "../../i18n/I18nProvider";

type PrincipalGroupManagementState = {
  error: string | null;
  groups: PrincipalGroupSummary[];
  isLoading: boolean;
  isSaving: boolean;
  members: AccountMemberSummary[];
  membershipByGroup: Record<string, string[]>;
  success: string | null;
};

const initialState: PrincipalGroupManagementState = {
  error: null,
  groups: [],
  isLoading: false,
  isSaving: false,
  members: [],
  membershipByGroup: {},
  success: null,
};

const memberDragPrefix = "member:";

type MyPageDictionary = ReturnType<typeof useI18n>["dictionary"]["mypage"];

const sortPrincipalGroups = (groups: PrincipalGroupSummary[]): PrincipalGroupSummary[] =>
  [...groups].sort((left, right) => Number(right.isDefault) - Number(left.isDefault));

const getMemberDisplayName = (member: AccountMemberSummary): string =>
  member.identityName.trim() || member.email || member.principalIdentifier;

const getGroupMembershipFromResponse = (
  groups: PrincipalGroupSummary[],
  members: AccountMemberSummary[],
): Record<string, string[]> => {
  const initialMembership = Object.fromEntries(
    groups.map((group) => [group.principalGroupIdentifier, [] as string[]]),
  );
  const memberIds = new Set(members.map((member) => member.principalIdentifier));

  groups.forEach((group) => {
    if (group.members) {
      initialMembership[group.principalGroupIdentifier] = group.members
        .map((member) => member.principalIdentifier)
        .filter((principalIdentifier) => memberIds.has(principalIdentifier));
    }
  });

  members.forEach((member) => {
    member.principalGroups.forEach((group) => {
      if (!initialMembership[group.principalGroupIdentifier]) {
        return;
      }
      if (!initialMembership[group.principalGroupIdentifier].includes(member.principalIdentifier)) {
        initialMembership[group.principalGroupIdentifier].push(member.principalIdentifier);
      }
    });
  });

  return initialMembership;
};

const createUpdatePayload = (membershipByGroup: Record<string, string[]>) => ({
  principalGroups: Object.entries(membershipByGroup).map(([principalGroupIdentifier, principalIdentifiers]) => ({
    principalGroupIdentifier,
    principalIdentifiers,
  })),
});

const areMembershipsEqual = (
  left: Record<string, string[]>,
  right: Record<string, string[]>,
): boolean => {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] &&
      left[key].length === right[key].length &&
      left[key].every((value, valueIndex) => value === right[key][valueIndex]),
    );
};

export function PrincipalGroupManagementPanel({
  canManage,
  onAuthorizationRejected,
  t,
}: {
  canManage: boolean;
  onAuthorizationRejected: () => void;
  t: MyPageDictionary;
}) {
  const [state, setState] = useState<PrincipalGroupManagementState>(initialState);
  const [savedMembershipByGroup, setSavedMembershipByGroup] = useState<Record<string, string[]>>({});
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );
  const memberByIdentifier = useMemo(
    () => new Map(state.members.map((member) => [member.principalIdentifier, member])),
    [state.members],
  );
  const hasUnsavedChanges = !areMembershipsEqual(state.membershipByGroup, savedMembershipByGroup);

  const load = useCallback(() => {
    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
      success: null,
    }));

    void Promise.all([
      fetchAccountMembers({ fallbackErrorMessage: t.principalGroupMembersLoadFailed }),
      fetchPrincipalGroups({ fallbackErrorMessage: t.principalGroupListLoadFailed }),
    ]).then(([membersResponse, groupsResponse]) => {
      const groups = sortPrincipalGroups(groupsResponse.principalGroups);
      const membershipByGroup = getGroupMembershipFromResponse(
        groups,
        membersResponse.members,
      );
      setSavedMembershipByGroup(membershipByGroup);
      setState({
        error: null,
        groups,
        isLoading: false,
        isSaving: false,
        members: membersResponse.members,
        membershipByGroup,
        success: null,
      });
    }).catch((error: unknown) => {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.principalGroupLoadFailed,
        isLoading: false,
        success: null,
      }));
    });
  }, [t.principalGroupListLoadFailed, t.principalGroupLoadFailed, t.principalGroupMembersLoadFailed]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const moveMember = (principalIdentifier: string, nextGroupIdentifier: string) => {
    setState((current) => {
      if (!current.membershipByGroup[nextGroupIdentifier]) {
        return current;
      }

      return {
        ...current,
        error: null,
        membershipByGroup: Object.fromEntries(
          Object.entries(current.membershipByGroup).map(([groupIdentifier, principalIdentifiers]) => [
            groupIdentifier,
            groupIdentifier === nextGroupIdentifier
              ? Array.from(new Set([...principalIdentifiers, principalIdentifier]))
              : principalIdentifiers.filter((candidate) => candidate !== principalIdentifier),
          ]),
        ),
        success: null,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeIdentifier = String(event.active.id);
    const overIdentifier = event.over?.id ? String(event.over.id) : null;

    if (!activeIdentifier.startsWith(memberDragPrefix) || !overIdentifier) {
      return;
    }

    const principalIdentifier = activeIdentifier.slice(memberDragPrefix.length);
    const nextGroupIdentifier = overIdentifier.startsWith(memberDragPrefix)
      ? Object.entries(state.membershipByGroup).find(([, principalIdentifiers]) =>
          principalIdentifiers.includes(overIdentifier.slice(memberDragPrefix.length)),
        )?.[0]
      : overIdentifier;

    if (nextGroupIdentifier) {
      moveMember(principalIdentifier, nextGroupIdentifier);
    }
  };

  const save = () => {
    if (!canManage) {
      setState((current) => ({
        ...current,
        error: t.principalGroupReadOnly,
        success: null,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isSaving: true,
      success: null,
    }));

    void updatePrincipalGroupMembers({
      fallbackErrorMessage: t.principalGroupSaveFailed,
      requestBody: createUpdatePayload(state.membershipByGroup),
    }).then(async (groupsResponse) => {
      const membersResponse = await fetchAccountMembers({ fallbackErrorMessage: t.principalGroupMembersLoadFailed });
      const groups = sortPrincipalGroups(groupsResponse.principalGroups);
      const membershipByGroup = getGroupMembershipFromResponse(groups, membersResponse.members);
      setSavedMembershipByGroup(membershipByGroup);
      setState((current) => ({
        ...current,
        error: null,
        groups,
        isSaving: false,
        members: membersResponse.members,
        membershipByGroup,
        success: t.principalGroupSaved,
      }));
    }).catch((error: unknown) => {
      if (isAccountBrowserApiError(error) && error.accountRouteStatus === 403) {
        onAuthorizationRejected();
      }

      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.principalGroupSaveFailed,
        isSaving: false,
        success: null,
      }));
    });
  };

  const isBusy = state.isLoading || state.isSaving;

  return (
    <section className="mt-5 rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t.principalGroupManagementTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            {t.principalGroupManagementDescription}
          </p>
        </div>
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isBusy || !canManage || !hasUnsavedChanges || state.groups.length === 0}
          onClick={save}
          type="button"
        >
          {state.isSaving ? t.principalGroupSaving : t.principalGroupSave}
        </button>
      </div>
      {state.isLoading ? (
        <p className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-4 text-sm font-semibold text-text-muted">
          {t.principalGroupLoading}
        </p>
      ) : null}
      {!state.isLoading && state.groups.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-4 text-sm font-semibold text-text-muted">
          {t.principalGroupEmpty}
        </p>
      ) : null}
      {!canManage ? (
        <p className="mt-5 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800">
          {t.principalGroupReadOnly}
        </p>
      ) : null}
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {state.groups.map((group) => (
            <PrincipalGroupColumn
              disabled={isBusy || !canManage}
              group={group}
              key={group.principalGroupIdentifier}
              memberByIdentifier={memberByIdentifier}
              membershipByGroup={state.membershipByGroup}
              t={t}
            />
          ))}
        </div>
      </DndContext>
      <div className="mt-5 grid gap-3">
        {hasUnsavedChanges ? (
          <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800" role="status">
            {t.principalGroupUnsavedChanges}
          </p>
        ) : null}
        {state.error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
            <p>{state.error}</p>
            <button
              className="mt-3 rounded-lg border border-red-300 px-4 py-2 transition hover:bg-red-100"
              onClick={load}
              type="button"
            >
              {t.principalGroupRetry}
            </button>
          </div>
        ) : null}
        {state.success ? (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">
            {state.success}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PrincipalGroupColumn({
  disabled,
  group,
  memberByIdentifier,
  membershipByGroup,
  t,
}: {
  disabled: boolean;
  group: PrincipalGroupSummary;
  memberByIdentifier: Map<string, AccountMemberSummary>;
  membershipByGroup: Record<string, string[]>;
  t: MyPageDictionary;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.principalGroupIdentifier, disabled });
  const principalIdentifiers = membershipByGroup[group.principalGroupIdentifier] ?? [];

  return (
    <section
      className={`min-h-56 rounded-xl border border-stroke-subtle bg-surface-base p-4 transition ${
        isOver ? "ring-4 ring-brand-highlight/50" : ""
      }`}
      ref={setNodeRef}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{group.name}</h3>
        </div>
        <span className="rounded-full border border-stroke-subtle px-2.5 py-1 text-xs font-semibold text-text-muted">
          {t.principalGroupMemberCount(principalIdentifiers.length)}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {principalIdentifiers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stroke-subtle p-4 text-center text-sm font-semibold text-text-muted">
            {t.principalGroupNoMembers}
          </p>
        ) : principalIdentifiers.map((principalIdentifier) => {
          const member = memberByIdentifier.get(principalIdentifier);

          return member ? (
            <PrincipalMemberCard
              disabled={disabled}
              key={principalIdentifier}
              member={member}
            />
          ) : null;
        })}
      </div>
    </section>
  );
}

function PrincipalMemberCard({
  disabled,
  member,
}: {
  disabled: boolean;
  member: AccountMemberSummary;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${memberDragPrefix}${member.principalIdentifier}`,
    disabled,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <article
      className={`rounded-lg border border-stroke-subtle bg-surface-raised p-3 text-sm shadow-soft transition ${
        isDragging ? "opacity-70" : ""
      }`}
      ref={setNodeRef}
      style={style}
    >
      <button
        className="w-full cursor-grab text-left disabled:cursor-default"
        disabled={disabled}
        type="button"
        {...listeners}
        {...attributes}
      >
        <span className="block font-semibold">{getMemberDisplayName(member)}</span>
        <span className="mt-1 block break-all text-xs text-text-muted">{member.email}</span>
      </button>
    </article>
  );
}

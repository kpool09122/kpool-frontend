import {
  fetchAccountMembers,
  fetchPrincipalGroups,
} from "@/gateways/account/accountBrowserApi";
import { saveAccountPrincipalGroups } from "@/gateways/account/accountPrincipalGroups";
import type {
  AccountMemberSummary,
  PrincipalGroupSummary,
} from "@/gateways/account/accountApi";
import type { PrincipalAccessRefresh } from "@/gateways/support/principalGroupSave";
import type { useI18n } from "@/i18n/I18nProvider";
import { adminQueryKeys } from "../../queryKeys";
import { usePrincipalGroupEditor } from "../../principal-groups/usePrincipalGroupEditor";
type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];
export const getMemberDisplayName = (member: AccountMemberSummary): string =>
  member.identityName.trim() || member.email || member.principalIdentifier;

const getGroupMembershipFromResponse = (
  groups: PrincipalGroupSummary[],
  members: AccountMemberSummary[],
): Record<string, string[]> => {
  const initialMembership = Object.fromEntries(
    groups.map((group) => [group.principalGroupIdentifier, [] as string[]]),
  );
  const memberIds = new Set(
    members.map((member) => member.principalIdentifier),
  );

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
      if (
        !initialMembership[group.principalGroupIdentifier].includes(
          member.principalIdentifier,
        )
      ) {
        initialMembership[group.principalGroupIdentifier].push(
          member.principalIdentifier,
        );
      }
    });
  });

  return initialMembership;
};

export const createUpdatePayload = (
  membershipByGroup: Readonly<Record<string, readonly string[]>>,
) => ({
  principalGroups: Object.entries(membershipByGroup).map(
    ([principalGroupIdentifier, principalIdentifiers]) => ({
      principalGroupIdentifier,
      principalIdentifiers,
    }),
  ),
});

const areArraysEqual = (left: string[], right: string[]): boolean => {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();

  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
};

export const areMembershipsEqual = (
  left: Record<string, string[]>,
  right: Record<string, string[]>,
): boolean => {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && areArraysEqual(left[key], right[key]),
    )
  );
};

export const getUserGroupIdentifiers = (
  membershipByGroup: Readonly<Record<string, readonly string[]>>,
  principalIdentifier: string,
): string[] =>
  Object.entries(membershipByGroup)
    .filter(([, principalIdentifiers]) =>
      principalIdentifiers.includes(principalIdentifier),
    )
    .map(([groupIdentifier]) => groupIdentifier);

export const updateMembershipForUser = (
  membershipByGroup: Readonly<Record<string, readonly string[]>>,
  principalIdentifier: string,
  nextGroupIdentifiers: string[],
): Record<string, string[]> => {
  const selectedGroups = new Set(nextGroupIdentifiers);

  return Object.fromEntries(
    Object.entries(membershipByGroup).map(
      ([groupIdentifier, principalIdentifiers]) => [
        groupIdentifier,
        selectedGroups.has(groupIdentifier)
          ? Array.from(new Set([...principalIdentifiers, principalIdentifier]))
          : principalIdentifiers.filter(
              (candidate) => candidate !== principalIdentifier,
            ),
      ],
    ),
  );
};

export function useAccountPrincipalGroups({
  canManage,
  accountIdentifier,
  actorIdentifier,
  sessionVersion,
  refreshAccess,
  t,
}: {
  canManage: boolean;
  accountIdentifier: string | null;
  actorIdentifier: string;
  sessionVersion: number;
  refreshAccess: PrincipalAccessRefresh;
  t: AdminDictionary;
}) {
  const adapt = (
    groups: PrincipalGroupSummary[],
    members: AccountMemberSummary[],
  ) => ({
    groups: groups.map((group) => ({
      ...group,
      members: getGroupMembershipFromResponse(groups, members)[
        group.principalGroupIdentifier
      ].flatMap((principalIdentifier) =>
        members.filter(
          (member) => member.principalIdentifier === principalIdentifier,
        ),
      ),
    })),
    members,
    users: members,
  });
  const editor = usePrincipalGroupEditor({
    scope: JSON.stringify([
      accountIdentifier,
      actorIdentifier,
      sessionVersion,
      canManage,
    ]),
    queryKey: [
      ...adminQueryKeys.account.principalGroups(),
      accountIdentifier,
      actorIdentifier,
      sessionVersion,
    ],
    enabled: canManage && Boolean(accountIdentifier),
    fetchList: async () => {
      const [members, groups] = await Promise.all([
        fetchAccountMembers({
          fallbackErrorMessage: t.principalGroupMembersLoadFailed,
        }),
        fetchPrincipalGroups({
          fallbackErrorMessage: t.principalGroupListLoadFailed,
        }),
      ]);
      return adapt(groups.principalGroups, members.members);
    },
    saveList: async (payload) => {
      const result = await saveAccountPrincipalGroups(payload);
      return {
        ...result,
        refresh: result.refresh.ok
          ? {
              ok: true as const,
              data: adapt(
                result.refresh.data.principalGroups,
                result.refresh.data.members,
              ),
            }
          : result.refresh,
      };
    },
    refreshAccess,
    t: {
      ...t.principalStatus,
      loadFailed: t.principalGroupLoadFailed,
      saveFailed: t.principalGroupSaveFailed,
      saved: t.principalGroupSaved,
    },
  });
  return {
    ...editor.actions,
    hasUnsavedChanges: editor.state.hasUnsavedChanges,
    isBusy: !editor.state.canManage,
    state: {
      ...editor.state,
      members: editor.state.users,
      error: editor.state.saveError ?? editor.state.loadError,
    },
    accessStatus: editor.accessStatus,
  };
}

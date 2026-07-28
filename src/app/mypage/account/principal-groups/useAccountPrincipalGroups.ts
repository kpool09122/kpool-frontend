import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchAccountMembers,
  fetchPrincipalGroups,
  isAccountBrowserApiError,
  updatePrincipalGroupMembers,
} from "@/gateways/account/accountBrowserApi";
import type { AccountMemberSummary, PrincipalGroupSummary } from "@/gateways/account/accountApi";
import type { useI18n } from "../../../i18n/I18nProvider";

export type PrincipalGroupManagementState = {
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

type MyPageDictionary = ReturnType<typeof useI18n>["dictionary"]["mypage"];

type UseAccountPrincipalGroupsParams = {
  canManage: boolean;
  onAuthorizationRejected: () => void;
  t: MyPageDictionary;
};

const sortPrincipalGroups = (groups: PrincipalGroupSummary[]): PrincipalGroupSummary[] =>
  [...groups].sort((left, right) => Number(right.isDefault) - Number(left.isDefault));

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

export const useAccountPrincipalGroups = ({
  canManage,
  onAuthorizationRejected,
  t,
}: UseAccountPrincipalGroupsParams) => {
  const [state, setState] = useState<PrincipalGroupManagementState>(initialState);
  const [savedMembershipByGroup, setSavedMembershipByGroup] = useState<Record<string, string[]>>({});
  const memberByIdentifier = useMemo(
    () => new Map(state.members.map((member) => [member.principalIdentifier, member])),
    [state.members],
  );
  const hasUnsavedChanges = !areMembershipsEqual(state.membershipByGroup, savedMembershipByGroup);
  const isBusy = state.isLoading || state.isSaving;

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

  return {
    hasUnsavedChanges,
    isBusy,
    memberByIdentifier,
    state,
    load,
    moveMember,
    save,
  };
};

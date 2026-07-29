import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  fetchAccountMembers,
  fetchPrincipalGroups,
  isAccountBrowserApiError,
  updatePrincipalGroupMembers,
} from "@/gateways/account/accountBrowserApi";
import type { AccountMemberSummary, PrincipalGroupSummary } from "@/gateways/account/accountApi";
import { adminQueryKeys } from "../../queryKeys";
import type { useI18n } from "../../../../i18n/I18nProvider";

export type PrincipalGroupManagementState = {
  error: string | null;
  groups: PrincipalGroupSummary[];
  isLoading: boolean;
  isSaving: boolean;
  members: AccountMemberSummary[];
  membershipByGroup: Record<string, string[]>;
  success: string | null;
};

type PrincipalGroupQueryState = {
  groups: PrincipalGroupSummary[];
  members: AccountMemberSummary[];
  membershipByGroup: Record<string, string[]>;
};

type MembershipDraft = {
  isDirty: boolean;
  membershipByGroup: Record<string, string[]>;
};

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];

type UseAccountPrincipalGroupsParams = {
  canManage: boolean;
  onAuthorizationRejected: () => void;
  t: AdminDictionary;
};

const emptyPrincipalGroupQueryState: PrincipalGroupQueryState = {
  groups: [],
  members: [],
  membershipByGroup: {},
};

const sortPrincipalGroups = (groups: PrincipalGroupSummary[]): PrincipalGroupSummary[] =>
  [...groups].sort((left, right) => Number(right.isDefault) - Number(left.isDefault));

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

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
  const queryClient = useQueryClient();
  const queryKey = adminQueryKeys.account.principalGroups();
  const [membershipDraft, setMembershipDraft] = useState<MembershipDraft>({
    isDirty: false,
    membershipByGroup: {},
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const principalGroupsQuery = useQuery<PrincipalGroupQueryState, Error>({
    queryFn: async () => {
      const [membersResponse, groupsResponse] = await Promise.all([
        fetchAccountMembers({ fallbackErrorMessage: t.principalGroupMembersLoadFailed }),
        fetchPrincipalGroups({ fallbackErrorMessage: t.principalGroupListLoadFailed }),
      ]);
      const groups = sortPrincipalGroups(groupsResponse.principalGroups);

      return {
        groups,
        members: membersResponse.members,
        membershipByGroup: getGroupMembershipFromResponse(groups, membersResponse.members),
      };
    },
    queryKey,
    retry: false,
  });
  const queryState = principalGroupsQuery.data ?? emptyPrincipalGroupQueryState;
  const membershipByGroup = membershipDraft.isDirty
    ? membershipDraft.membershipByGroup
    : queryState.membershipByGroup;
  const memberByIdentifier = useMemo(
    () => new Map(queryState.members.map((member) => [member.principalIdentifier, member])),
    [queryState.members],
  );
  const hasUnsavedChanges = !areMembershipsEqual(membershipByGroup, queryState.membershipByGroup);

  const saveMutation = useMutation<PrincipalGroupQueryState, Error, Record<string, string[]>>({
    mutationFn: async (nextMembershipByGroup) => {
      const groupsResponse = await updatePrincipalGroupMembers({
        fallbackErrorMessage: t.principalGroupSaveFailed,
        requestBody: createUpdatePayload(nextMembershipByGroup),
      });
      const membersResponse = await fetchAccountMembers({
        fallbackErrorMessage: t.principalGroupMembersLoadFailed,
      });
      const groups = sortPrincipalGroups(groupsResponse.principalGroups);

      return {
        groups,
        members: membersResponse.members,
        membershipByGroup: getGroupMembershipFromResponse(groups, membersResponse.members),
      };
    },
    onMutate: () => {
      setFormError(null);
      setSuccess(null);
    },
    onSuccess: (nextQueryState) => {
      queryClient.setQueryData(queryKey, nextQueryState);
      setMembershipDraft({
        isDirty: false,
        membershipByGroup: nextQueryState.membershipByGroup,
      });
      setSuccess(t.principalGroupSaved);
    },
    onError: (error) => {
      if (isAccountBrowserApiError(error) && error.accountRouteStatus === 403) {
        onAuthorizationRejected();
      }

      setFormError(getErrorMessage(error, t.principalGroupSaveFailed));
    },
  });

  const moveMember = (principalIdentifier: string, nextGroupIdentifier: string) => {
    setMembershipDraft((current) => {
      const currentMembershipByGroup = current.isDirty
        ? current.membershipByGroup
        : queryState.membershipByGroup;

      if (!currentMembershipByGroup[nextGroupIdentifier]) {
        return current;
      }

      return {
        isDirty: true,
        membershipByGroup: Object.fromEntries(
          Object.entries(currentMembershipByGroup).map(([groupIdentifier, principalIdentifiers]) => [
            groupIdentifier,
            groupIdentifier === nextGroupIdentifier
              ? Array.from(new Set([...principalIdentifiers, principalIdentifier]))
              : principalIdentifiers.filter((candidate) => candidate !== principalIdentifier),
          ]),
        ),
      };
    });
    setFormError(null);
    setSuccess(null);
  };

  const load = () => {
    setFormError(null);
    setSuccess(null);
    void principalGroupsQuery.refetch();
  };

  const save = () => {
    if (!canManage) {
      setFormError(t.principalGroupReadOnly);
      setSuccess(null);
      return;
    }

    saveMutation.mutate(membershipByGroup);
  };

  const state: PrincipalGroupManagementState = {
    error: formError ?? (principalGroupsQuery.error
      ? getErrorMessage(principalGroupsQuery.error, t.principalGroupLoadFailed)
      : null),
    groups: queryState.groups,
    isLoading: principalGroupsQuery.isFetching && !principalGroupsQuery.data,
    isSaving: saveMutation.isPending,
    members: queryState.members,
    membershipByGroup,
    success,
  };

  return {
    hasUnsavedChanges,
    isBusy: state.isLoading || state.isSaving,
    memberByIdentifier,
    state,
    load,
    moveMember,
    save,
  };
};

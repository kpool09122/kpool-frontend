import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  fetchWikiPrincipalGroups,
  isWikiPrincipalGroupBrowserApiError,
  updateWikiPrincipalGroupMembers,
  type WikiPrincipalGroupMemberSummary,
  type WikiPrincipalGroupSummary,
} from "@/gateways/wiki/wikiPrincipalGroups";
import { adminQueryKeys } from "../../queryKeys";
import type { useI18n } from "../../../../i18n/I18nProvider";

export type WikiPrincipalGroupManagementState = {
  error: string | null;
  groups: WikiPrincipalGroupSummary[];
  isLoading: boolean;
  isSaving: boolean;
  membershipByGroup: Record<string, string[]>;
  success: string | null;
  users: WikiPrincipalGroupMemberSummary[];
};

type WikiPrincipalGroupQueryState = {
  groups: WikiPrincipalGroupSummary[];
  membershipByGroup: Record<string, string[]>;
  users: WikiPrincipalGroupMemberSummary[];
};

type MembershipDraft = {
  isDirty: boolean;
  membershipByGroup: Record<string, string[]>;
};

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];

const emptyWikiPrincipalGroupQueryState: WikiPrincipalGroupQueryState = {
  groups: [],
  membershipByGroup: {},
  users: [],
};

const sortPrincipalGroups = (
  groups: WikiPrincipalGroupSummary[],
): WikiPrincipalGroupSummary[] =>
  [...groups].sort((left, right) =>
    Number(right.isDefault) - Number(left.isDefault) || left.name.localeCompare(right.name),
  );

const sortUsers = (
  users: WikiPrincipalGroupMemberSummary[],
): WikiPrincipalGroupMemberSummary[] =>
  [...users].sort((left, right) =>
    getUserDisplayName(left).localeCompare(getUserDisplayName(right)),
  );

export const getUserDisplayName = (user: WikiPrincipalGroupMemberSummary): string =>
  user.identityName.trim() || user.email || user.principalIdentifier;

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const getQueryStateFromGroups = (
  groups: WikiPrincipalGroupSummary[],
): WikiPrincipalGroupQueryState => {
  const usersByIdentifier = new Map<string, WikiPrincipalGroupMemberSummary>();
  const membershipByGroup: Record<string, string[]> = {};

  groups.forEach((group) => {
    membershipByGroup[group.principalGroupIdentifier] = group.members.map((member) => {
      usersByIdentifier.set(member.principalIdentifier, member);
      return member.principalIdentifier;
    });
  });

  return {
    groups,
    membershipByGroup,
    users: sortUsers(Array.from(usersByIdentifier.values())),
  };
};

const createUpdatePayload = (membershipByGroup: Record<string, string[]>) => ({
  principalGroups: Object.entries(membershipByGroup).map(([principalGroupIdentifier, principalIdentifiers]) => ({
    principalGroupIdentifier,
    principalIdentifiers,
  })),
});

const areArraysEqual = (left: string[], right: string[]): boolean => {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();

  return sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index]);
};

const areMembershipsEqual = (
  left: Record<string, string[]>,
  right: Record<string, string[]>,
): boolean => {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] && areArraysEqual(left[key], right[key]),
    );
};

export const getUserGroupIdentifiers = (
  membershipByGroup: Record<string, string[]>,
  principalIdentifier: string,
): string[] =>
  Object.entries(membershipByGroup)
    .filter(([, principalIdentifiers]) => principalIdentifiers.includes(principalIdentifier))
    .map(([groupIdentifier]) => groupIdentifier);

export const useWikiPrincipalGroups = ({
  accountIdentifier,
  canManage,
  onAuthorizationRejected,
  t,
}: {
  accountIdentifier: string | null;
  canManage: boolean;
  onAuthorizationRejected: () => void;
  t: AdminDictionary;
}) => {
  const queryClient = useQueryClient();
  const queryKey = adminQueryKeys.principalGroupManagement.current(accountIdentifier);
  const [membershipDraft, setMembershipDraft] = useState<MembershipDraft>({
    isDirty: false,
    membershipByGroup: {},
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const principalGroupsQuery = useQuery<WikiPrincipalGroupQueryState, Error>({
    enabled: Boolean(accountIdentifier) && canManage,
    queryFn: async () => {
      if (!accountIdentifier) {
        return emptyWikiPrincipalGroupQueryState;
      }

      const response = await fetchWikiPrincipalGroups({
        accountIdentifier,
        fallbackErrorMessage: t.wikiPrincipalGroupListLoadFailed,
      });
      return getQueryStateFromGroups(sortPrincipalGroups(response.principalGroups));
    },
    queryKey,
    retry: false,
  });
  const queryState = principalGroupsQuery.data ?? emptyWikiPrincipalGroupQueryState;
  const membershipByGroup = membershipDraft.isDirty
    ? membershipDraft.membershipByGroup
    : queryState.membershipByGroup;
  const userByIdentifier = useMemo(
    () => new Map(queryState.users.map((user) => [user.principalIdentifier, user])),
    [queryState.users],
  );
  const hasUnsavedChanges = !areMembershipsEqual(membershipByGroup, queryState.membershipByGroup);

  const saveMutation = useMutation<WikiPrincipalGroupQueryState, Error, Record<string, string[]>>({
    mutationFn: async (nextMembershipByGroup) => {
      const response = await updateWikiPrincipalGroupMembers({
        fallbackErrorMessage: t.wikiPrincipalGroupSaveFailed,
        requestBody: createUpdatePayload(nextMembershipByGroup),
      });

      return getQueryStateFromGroups(sortPrincipalGroups(response.principalGroups));
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
      setSuccess(t.wikiPrincipalGroupSaved);
    },
    onError: (error) => {
      if (isWikiPrincipalGroupBrowserApiError(error) && error.wikiPrincipalGroupRouteStatus === 403) {
        onAuthorizationRejected();
      }

      setFormError(getErrorMessage(error, t.wikiPrincipalGroupSaveFailed));
    },
  });

  const updateUserGroups = (principalIdentifier: string, nextGroupIdentifiers: string[]) => {
    setMembershipDraft((current) => {
      const currentMembershipByGroup = current.isDirty
        ? current.membershipByGroup
        : queryState.membershipByGroup;
      const selectedGroups = new Set(nextGroupIdentifiers);

      return {
        isDirty: true,
        membershipByGroup: Object.fromEntries(
          Object.entries(currentMembershipByGroup).map(([groupIdentifier, principalIdentifiers]) => [
            groupIdentifier,
            selectedGroups.has(groupIdentifier)
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
      setFormError(t.wikiPrincipalGroupReadOnly);
      setSuccess(null);
      return;
    }

    saveMutation.mutate(membershipByGroup);
  };

  const state: WikiPrincipalGroupManagementState = {
    error: formError ?? (principalGroupsQuery.error
      ? getErrorMessage(principalGroupsQuery.error, t.wikiPrincipalGroupLoadFailed)
      : null),
    groups: queryState.groups,
    isLoading: principalGroupsQuery.isFetching && !principalGroupsQuery.data,
    isSaving: saveMutation.isPending,
    membershipByGroup,
    success,
    users: queryState.users,
  };

  return {
    hasUnsavedChanges,
    isBusy: state.isLoading || state.isSaving,
    state,
    userByIdentifier,
    load,
    save,
    updateUserGroups,
  };
};

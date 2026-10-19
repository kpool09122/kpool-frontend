import {
  fetchWikiPrincipalGroups,
  updateWikiPrincipalGroupMembers,
  type WikiPrincipalGroupSummary,
  type WikiPrincipalGroupMemberSummary,
} from "@/gateways/wiki/wikiPrincipalGroups";
import type { PrincipalAccessRefresh } from "@/gateways/support/principalGroupSave";
import type { useI18n } from "@/i18n/I18nProvider";
import { adminQueryKeys } from "../../queryKeys";
import { usePrincipalGroupEditor } from "../../principal-groups/usePrincipalGroupEditor";
type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];
type WikiPrincipalGroupQueryState = {
  groups: WikiPrincipalGroupSummary[];
  users: WikiPrincipalGroupMemberSummary[];
  membershipByGroup: Readonly<Record<string, readonly string[]>>;
};
const sortUsers = (users: WikiPrincipalGroupMemberSummary[]) =>
  [...users].sort((a, b) =>
    getUserDisplayName(a).localeCompare(getUserDisplayName(b)),
  );
export const getUserDisplayName = (
  user: WikiPrincipalGroupMemberSummary,
): string => user.identityName.trim() || user.email || user.principalIdentifier;

// Wiki returns members under groups (unlike SiteManagement's top-level principals).
const getQueryStateFromGroups = (
  groups: WikiPrincipalGroupSummary[],
): WikiPrincipalGroupQueryState => {
  const users = new Map<string, WikiPrincipalGroupMemberSummary>();
  groups.forEach((group) =>
    group.members.forEach((member) =>
      users.set(member.principalIdentifier, member),
    ),
  );
  return {
    groups,
    users: sortUsers([...users.values()]),
    membershipByGroup: Object.fromEntries(
      groups.map((group) => [
        group.principalGroupIdentifier,
        group.members.map((member) => member.principalIdentifier),
      ]),
    ),
  };
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

export function useWikiPrincipalGroups({
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
  const editor = usePrincipalGroupEditor({
    scope: JSON.stringify([
      accountIdentifier,
      actorIdentifier,
      sessionVersion,
      canManage,
    ]),
    queryKey: [
      ...adminQueryKeys.principalGroupManagement.current(accountIdentifier),
      actorIdentifier,
      sessionVersion,
    ],
    enabled: canManage && Boolean(accountIdentifier),
    fetchList: async () => {
      const data = await fetchWikiPrincipalGroups({
        accountIdentifier: accountIdentifier!,
        fallbackErrorMessage: t.wikiPrincipalGroupLoadFailed,
      });
      return getQueryStateFromGroups(data.principalGroups);
    },
    saveList: async (payload) => {
      const result = await updateWikiPrincipalGroupMembers({
        requestBody: payload,
        fallbackErrorMessage: t.wikiPrincipalGroupSaveFailed,
      });
      return {
        ...result,
        refresh: result.refresh.ok
          ? {
              ok: true as const,
              data: getQueryStateFromGroups(
                result.refresh.data.principalGroups,
              ),
            }
          : result.refresh,
      };
    },
    refreshAccess,
    t: {
      ...t.principalStatus,
      loadFailed: t.wikiPrincipalGroupLoadFailed,
      saveFailed: t.wikiPrincipalGroupSaveFailed,
      saved: t.wikiPrincipalGroupSaved,
    },
  });
  return {
    ...editor.actions,
    hasUnsavedChanges: editor.state.hasUnsavedChanges,
    isBusy: !editor.state.canManage,
    state: {
      ...editor.state,
      error: editor.state.saveError ?? editor.state.loadError,
    },
    accessStatus: editor.accessStatus,
  };
}

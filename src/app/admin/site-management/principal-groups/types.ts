import type { dictionaries } from "@/i18n/dictionaries";

/** View models, not API types. #448 adapts the independent principals list. */
export type SiteManagementUser = {
  principalIdentifier: string;
  identityName: string;
  email: string;
};
export type SiteManagementGroup = {
  principalGroupIdentifier: string;
  name: string;
  description?: string;
  /** Optional known UpperCamelCase role names, NOT API roleIdentifiers (UUIDs).
   * #710 already excludes Operator groups. #448 may omit this metadata when
   * adapting that filtered response; do not invent role names from UUIDs.
   */
  roles?: readonly string[];
};
export type SiteManagementMemberships = Readonly<Record<string, readonly string[]>>;
export type SiteManagementPrincipalGroupState = {
  users: readonly SiteManagementUser[];
  groups: readonly SiteManagementGroup[];
  /** Page draft; saved memberships belong to the future communication hook. */
  membershipByGroup: SiteManagementMemberships;
  canManage: boolean;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  saveError: string | null;
  success: string | null;
  /** Saved but authorization/list refresh is unconfirmed; retry must never PATCH. */
  canRetryRefresh?: boolean;
};
export type SiteManagementPrincipalGroupActions = {
  updateUserGroups: (principalIdentifier: string, groupIdentifiers: string[]) => void;
  save: () => void;
  /** The hook decides how to reconcile drafts on refresh; UI never discards them. */
  load: () => void;
};
export type SiteManagementDictionary = typeof dictionaries.ja.admin.siteManagementPrincipalGroups;

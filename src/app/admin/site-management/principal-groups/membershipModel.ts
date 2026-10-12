import type { SiteManagementGroup, SiteManagementMemberships, SiteManagementUser } from "./types";

export const getSiteManagementEditableGroups = (groups: readonly SiteManagementGroup[]) =>
  groups.filter((group) => !group.roles?.includes("Operator"));

export const getSiteManagementUserDisplayName = (user: SiteManagementUser) =>
  user.identityName.trim() || user.email.trim() || user.principalIdentifier;

export const getSiteManagementUserGroupIdentifiers = (
  memberships: SiteManagementMemberships, principalIdentifier: string,
) => Object.entries(memberships)
  .filter(([, members]) => members.includes(principalIdentifier))
  .map(([identifier]) => identifier);

/** Pure update: preserves other users and all non-editable/unknown memberships. */
export const updateSiteManagementUserGroups = (
  memberships: SiteManagementMemberships,
  groups: readonly SiteManagementGroup[],
  principalIdentifier: string,
  groupIdentifiers: readonly string[],
): SiteManagementMemberships => {
  const editable = new Set(getSiteManagementEditableGroups(groups).map((group) => group.principalGroupIdentifier));
  const selected = new Set(groupIdentifiers);
  const identifiers = new Set([...Object.keys(memberships), ...editable]);
  return Object.fromEntries(Array.from(identifiers, (identifier) => {
    const members = memberships[identifier] ?? [];
    return [identifier, !editable.has(identifier) ? [...members] : selected.has(identifier)
      ? Array.from(new Set([...members, principalIdentifier]))
      : members.filter((member) => member !== principalIdentifier)];
  }));
};

/** Memberships are sets: ordering, duplicates and absent empty groups are immaterial. */
export const areSiteManagementMembershipsEqual = (
  left: SiteManagementMemberships, right: SiteManagementMemberships,
) => Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).every((key) => {
  const a = new Set(left[key] ?? []);
  const b = new Set(right[key] ?? []);
  return a.size === b.size && Array.from(a).every((member) => b.has(member));
});

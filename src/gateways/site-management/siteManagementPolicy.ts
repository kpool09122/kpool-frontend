import { isAccountActive, type AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";

const hasPermission = (
  identity: AuthenticatedIdentitySummary | null,
  action: string,
  resourceType: string,
  ownContact = false,
): boolean => {
  if (!identity || identity.accountPrincipalStatus !== "active" || identity.siteManagementPrincipalStatus !== "active" || !isAccountActive(identity) || !identity.accountIdentifier || !identity.siteManagementPrincipalIdentifier) return false;
  const applicable = (identity.siteManagementPolicies ?? []).flatMap((policy) => policy.statements).filter((statement) =>
    statement.actions.includes(action) && statement.resourceTypes.includes(resourceType) &&
    (statement.condition === null || (statement.condition === "own_contact" && resourceType === "contact" && ownContact)),
  );
  return !applicable.some((statement) => statement.effect === "deny") && applicable.some((statement) => statement.effect === "allow");
};

/** Mirrors SiteManagement PolicyEvaluator: exact action/resource and applicable deny first. */
export const canManageSiteManagementPrincipalGroups = (identity: AuthenticatedIdentitySummary | null): boolean =>
  hasPermission(identity, "principal-group:manage", "principal_group");

export const canUseAnnouncements = (identity: AuthenticatedIdentitySummary | null, action: "view-draft" | "create" | "update" | "translate" | "publish" | "delete") => hasPermission(identity, `announcement:${action}`, "announcement");
export const canViewSiteManagementContacts = (identity: AuthenticatedIdentitySummary | null): boolean =>
  hasPermission(identity, "contact:view", "contact");

export const canReplyToSiteManagementContacts = (identity: AuthenticatedIdentitySummary | null): boolean =>
  hasPermission(identity, "contact:reply", "contact");

/** Submitters reply through their own-contact viewing permission, without operator reply permission. */
export const canReplyToMyContacts = (identity: AuthenticatedIdentitySummary | null): boolean =>
  hasPermission(identity, "contact:view", "contact", true);

/** Section access depends on permissions, independently of tab visibility and member count. */
export const canAccessSiteManagement = (identity: AuthenticatedIdentitySummary | null): boolean =>
  canManageSiteManagementPrincipalGroups(identity) ||
  ["announcement:view-draft", "announcement:create", "announcement:update", "announcement:publish", "announcement:translate", "announcement:delete"]
    .some((action) => hasPermission(identity, action, "announcement")) ||
  ["contact:view", "contact:reply"].some((action) =>
    hasPermission(identity, action, "contact") || hasPermission(identity, action, "contact", true),
  );

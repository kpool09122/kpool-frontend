import { isAccountActive, type AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";

/** Mirrors SiteManagement PolicyEvaluator: exact action/resource, deny first.
 * own_contact can never match a principal_group resource. No Account clauses.
 */
export const canManageSiteManagementPrincipalGroups = (identity: AuthenticatedIdentitySummary | null): boolean => {
  if (!identity || !isAccountActive(identity) || !identity.accountIdentifier || !identity.siteManagementPrincipalIdentifier) return false;
  const applicable = (identity.siteManagementPolicies ?? []).flatMap((policy) => policy.statements).filter((statement) =>
    statement.actions.includes("principal-group:manage") && statement.resourceTypes.includes("principal_group") && statement.condition === null,
  );
  return !applicable.some((statement) => statement.effect === "deny") && applicable.some((statement) => statement.effect === "allow");
};

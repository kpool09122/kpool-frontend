import { canManagePrincipalGroups } from "@/gateways/account/accountPolicy";
import { canManageSiteManagementPrincipalGroups } from "@/gateways/site-management/siteManagementPolicy";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { canManageWikiPrincipalGroups, type WikiPrincipalSummary } from "@/gateways/wiki/wikiPrincipal";

const hasMultipleAccountIdentities = (identity: AuthenticatedIdentitySummary | null): boolean =>
  (identity?.accountIdentityCount ?? 0) >= 2;

export const canShowAccountPrincipalGroupManagement = (
  identity: AuthenticatedIdentitySummary | null,
): boolean => hasMultipleAccountIdentities(identity) && canManagePrincipalGroups(identity);

export const canShowWikiPrincipalGroupManagement = (
  principal: WikiPrincipalSummary,
): boolean => principal.accountPrincipalCount >= 2 && canManageWikiPrincipalGroups(principal);

export const canShowSiteManagementPrincipalGroupManagement = (
  identity: AuthenticatedIdentitySummary | null,
): boolean => (identity?.siteManagementPrincipalCount ?? 0) >= 2 && canManageSiteManagementPrincipalGroups(identity);

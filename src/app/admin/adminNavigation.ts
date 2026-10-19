import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { hasAccountPolicy } from "@/gateways/account/accountPolicy";
import { isAccountActive, type AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { canAccessSiteManagement } from "@/gateways/site-management/siteManagementPolicy";
import { adminSectionRoutes, type AdminSection } from "./adminTypes";

export type AdminNavigationItem = {
  section: AdminSection;
  href: string;
  labelKey: "wikiMenu" | "siteManagementMenu" | "accountSettingsMenu" | "settingsMenu";
};

/** The sidebar order also determines the default landing page. */
export function getAdminNavigation(identity: AuthenticatedIdentitySummary): AdminNavigationItem[] {
  const accountAvailable = isAccountActive(identity)
    && identity.accountPrincipalStatus !== "suspended"
    && identity.accountPrincipalStatus !== "forced_stop";
  const wikiStopped = identity.wikiPrincipalStatus === "suspended" || identity.wikiPrincipalStatus === "forced_stop";
  return [
    ...(accountAvailable && !wikiStopped ? [{ section: "wiki" as const, href: adminSectionRoutes.wiki, labelKey: "wikiMenu" as const }] : []),
    ...(canAccessSiteManagement(identity) ? [{ section: "siteManagement" as const, href: adminSectionRoutes.siteManagement, labelKey: "siteManagementMenu" as const }] : []),
    ...(accountAvailable && getAccountIdentifierFromIdentity(identity) && hasAccountPolicy(identity) ? [{ section: "accountSettings" as const, href: adminSectionRoutes.accountSettings, labelKey: "accountSettingsMenu" as const }] : []),
    { section: "settings", href: adminSectionRoutes.settings, labelKey: "settingsMenu" },
  ];
}

export function getAdminInitialRoute(identity: AuthenticatedIdentitySummary): string {
  return getAdminNavigation(identity)[0].href;
}

export function resolveAdminSection(pathname: string | null): AdminSection {
  if (pathname?.startsWith("/admin/account")) return "accountSettings";
  if (pathname?.startsWith("/admin/user")) return "settings";
  if (pathname?.startsWith("/admin/site-management")) return "siteManagement";
  return "wiki";
}

/** Preserve return destinations unless they point to a hidden admin section. */
export function resolveAdminDestination(identity: AuthenticatedIdentitySummary, destination: string): string {
  const pathname = destination.split(/[?#]/, 1)[0];
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return destination;
  if (pathname === "/admin") return destination === pathname ? getAdminInitialRoute(identity) : destination;
  return getAdminNavigation(identity).some((item) => item.section === resolveAdminSection(pathname))
    ? destination
    : getAdminInitialRoute(identity);
}

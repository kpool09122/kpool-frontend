"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { canInviteAccountMembers, canManagePrincipalGroups, canUpdateAccount, hasAccountPolicy } from "@/gateways/account/accountPolicy";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import { getAccountIdentifierFromIdentity, type WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { useI18n } from "../../../i18n/I18nProvider";
import { AccountSectionProvider } from "./AccountSectionContext";
import {
  adminSectionRoutes,
  adminAccountTabRoutes,
  type AdminAccountSettingsTab,
} from "../adminTypes";

const createAccountSettingsTab = (
  id: AdminAccountSettingsTab,
  label: string,
): { id: AdminAccountSettingsTab; label: string } => ({
  id,
  label,
});

type AccountLayoutClientProps = {
  activeTab: AdminAccountSettingsTab;
  children: ReactNode;
  currentIdentity: IdentitySummary | null;
  principalState: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
  onAuthorizationRejected: () => void;
};

export function AccountLayoutClient({
  activeTab,
  children,
  currentIdentity,
  principalState,
  t,
  onAuthorizationRejected,
}: AccountLayoutClientProps) {
  const router = useRouter();
  const accountIdentifier = getAccountIdentifierFromIdentity(currentIdentity);
  const canShowAccountSettings = Boolean(accountIdentifier) && hasAccountPolicy(currentIdentity);
  const canEdit = canUpdateAccount(currentIdentity);
  const canInvite = canInviteAccountMembers(currentIdentity);
  const canManageAccountPrincipalGroups = canManagePrincipalGroups(currentIdentity);

  useEffect(() => {
    if (!canShowAccountSettings) {
      router.replace(adminSectionRoutes.wiki);
      return;
    }

    if (activeTab === "accountInvitations" && !canInvite) {
      router.replace(adminAccountTabRoutes.accountProfile);
      return;
    }

    if (activeTab === "principalGroupManagement" && !canManageAccountPrincipalGroups) {
      router.replace(adminAccountTabRoutes.accountProfile);
    }
  }, [activeTab, canInvite, canManageAccountPrincipalGroups, canShowAccountSettings, router]);

  const tabs = [
    createAccountSettingsTab("accountProfile", t.accountInformationTab),
    createAccountSettingsTab("accountDocuments", t.accountDocuments.tab),
    ...(canInvite ? [createAccountSettingsTab("accountInvitations", t.accountInvitationsTab)] : []),
    ...(canManageAccountPrincipalGroups ? [createAccountSettingsTab("principalGroupManagement", t.principalGroupManagementTab)] : []),
  ];
  const selectedTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : "accountProfile";

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.accountSettingsTabsLabel} className="-mb-px flex gap-1" role="tablist">
          {tabs.map((tab) => (
            <Link
              aria-selected={selectedTab === tab.id}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                selectedTab === tab.id
                  ? "border-brand-primary text-text-strong"
                  : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
              }`}
              href={adminAccountTabRoutes[tab.id]}
              key={tab.id}
              role="tab"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <AccountSectionProvider
        value={{
          accountIdentifier,
          canEdit,
          canInvite,
          canManagePrincipalGroups: canManageAccountPrincipalGroups,
          principalState,
          t,
          onAuthorizationRejected,
        }}
      >
        {children}
      </AccountSectionProvider>
    </section>
  );
}

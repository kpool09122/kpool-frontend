"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { canInviteAccountMembers, canManagePrincipalGroups, canUpdateAccount, hasAccountPolicy, isCorporationAccount } from "@/gateways/account/accountPolicy";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import { getAccountIdentifierFromIdentity, type WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { useI18n } from "../../../i18n/I18nProvider";
import { AccountSectionProvider } from "./AccountSectionContext";
import {
  myPageSectionRoutes,
  myPageAccountTabRoutes,
  type MyPageAccountSettingsTab,
} from "../myPageTypes";

const createAccountSettingsTab = (
  id: MyPageAccountSettingsTab,
  label: string,
): { id: MyPageAccountSettingsTab; label: string } => ({
  id,
  label,
});

type AccountLayoutClientProps = {
  activeTab: MyPageAccountSettingsTab;
  children: ReactNode;
  currentIdentity: IdentitySummary | null;
  principalState: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
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
  const canShowAccountSettings = Boolean(accountIdentifier) && isCorporationAccount(currentIdentity) && hasAccountPolicy(currentIdentity);
  const canEdit = canUpdateAccount(currentIdentity);
  const canInvite = canInviteAccountMembers(currentIdentity);
  const canManageAccountPrincipalGroups = canManagePrincipalGroups(currentIdentity);

  useEffect(() => {
    if (!canShowAccountSettings) {
      router.replace(myPageSectionRoutes.wiki);
      return;
    }

    if (activeTab === "accountInvitations" && !canInvite) {
      router.replace(myPageAccountTabRoutes.accountProfile);
      return;
    }

    if (activeTab === "principalGroupManagement" && !canManageAccountPrincipalGroups) {
      router.replace(myPageAccountTabRoutes.accountProfile);
    }
  }, [activeTab, canInvite, canManageAccountPrincipalGroups, canShowAccountSettings, router]);

  const tabs = [
    createAccountSettingsTab("accountProfile", t.accountInformationTab),
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
              href={myPageAccountTabRoutes[tab.id]}
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

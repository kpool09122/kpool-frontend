"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAccountIdentifierFromIdentity, getAccountPrincipalIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { canReadAccountNotificationSettings, canUpdateAccountNotificationSettings, canAccessAffiliations, canApproveAffiliations, canApproveDelegations, canInviteAccountMembers, canManageAccountCategoryChangeRequests, canReceiveAffiliationRequests, canRejectAffiliations, canRejectDelegations, canRequestAffiliation, canRequestDelegation, canUpdateAccount, hasAccountPolicy } from "@/gateways/account/accountPolicy";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import type { useI18n } from "../../../i18n/I18nProvider";
import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import { getAdminInitialRoute } from "../adminNavigation";
import { canShowAccountPrincipalGroupManagement } from "../principalGroupVisibility";
import { AccountSectionProvider } from "./AccountSectionContext";
import {
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
  currentIdentity: AuthenticatedIdentitySummary | null;
  principalState?: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
  onAuthorizationRejected: () => void;
};

export function AccountLayoutClient({
  activeTab,
  children,
  currentIdentity,
  principalState = { status: "idle" },
  t,
  onAuthorizationRejected,
}: AccountLayoutClientProps) {
  const defaultAdminRoute = currentIdentity ? getAdminInitialRoute(currentIdentity, principalState) : "/admin";
  const accountIdentifier = getAccountIdentifierFromIdentity(currentIdentity);
  const accountPrincipalIdentifier = getAccountPrincipalIdentifierFromIdentity(currentIdentity);
  const canShowAccountSettings = Boolean(accountIdentifier) && hasAccountPolicy(currentIdentity);
  const canReadNotifications = canReadAccountNotificationSettings(currentIdentity);
  const canUpdateNotifications = canUpdateAccountNotificationSettings(currentIdentity);
  const canEdit = canUpdateAccount(currentIdentity);
  const canInvite = canInviteAccountMembers(currentIdentity);
  const canManageAccountPrincipalGroups = canShowAccountPrincipalGroupManagement(currentIdentity);
  const canManageCategoryChangeRequests = canManageAccountCategoryChangeRequests(currentIdentity);
  const canShowAffiliations = canAccessAffiliations(currentIdentity);
  const canCreateAffiliationRequest = canRequestAffiliation(currentIdentity);
  const canCreateDelegationRequest = canRequestDelegation(currentIdentity);
  const canApproveDelegationRequests = canApproveDelegations(currentIdentity);
  const canRejectDelegationRequests = canRejectDelegations(currentIdentity);
  const canReviewDelegations = canApproveDelegationRequests || canRejectDelegationRequests;
  const canShowDelegations = canCreateDelegationRequest || canReviewDelegations;
  const canReceiveAffiliationReviewRequests = canReceiveAffiliationRequests(currentIdentity);
  const canApproveAffiliationRequests = canApproveAffiliations(currentIdentity);
  const canRejectAffiliationRequests = canRejectAffiliations(currentIdentity);
  const fallbackTab: AdminAccountSettingsTab = "accountProfile";
  const fallbackRoute = adminAccountTabRoutes[fallbackTab];

  const tabs = [
    createAccountSettingsTab("accountProfile", t.accountInformationTab),
    createAccountSettingsTab("accountDocuments", t.accountDocuments.tab),
    ...(canReadNotifications ? [createAccountSettingsTab("accountNotifications", t.accountNotifications.tab)] : []),
    ...(accountIdentifier ? [createAccountSettingsTab("accountCategoryChange", t.accountCategoryChange.tab)] : []),
    ...(canManageCategoryChangeRequests ? [createAccountSettingsTab("unapprovedAccountCategoryChangeRequests", t.accountCategoryChangeRequests.tab)] : []),
    ...(canShowAffiliations ? [createAccountSettingsTab("accountAffiliations", t.accountAffiliations.tab)] : []),
    ...(canShowDelegations ? [createAccountSettingsTab("accountDelegations", t.accountDelegations.tab)] : []),
    ...(canInvite ? [createAccountSettingsTab("accountInvitations", t.accountInvitationsTab)] : []),
    ...(canManageAccountPrincipalGroups ? [createAccountSettingsTab("principalGroupManagement", t.principalGroupManagementTab)] : []),
  ];
  const activeTabAllowed = tabs.some((tab) => tab.id === activeTab);
  if (!canShowAccountSettings) redirect(defaultAdminRoute);
  if (!activeTabAllowed) redirect(fallbackRoute);

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.accountSettingsTabsLabel} className="-mb-px flex gap-1" role="tablist">
          {tabs.map((tab) => (
            <Link
              aria-selected={activeTab === tab.id}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
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
          accountPrincipalIdentifier,
          canReadNotifications,
          canUpdateNotifications,
          canEdit,
          canInvite,
          canManagePrincipalGroups: canManageAccountPrincipalGroups,
          canManageCategoryChangeRequests,
          canRequestAffiliation: canCreateAffiliationRequest,
          canRequestDelegation: canCreateDelegationRequest,
          canApproveDelegations: canApproveDelegationRequests,
          canRejectDelegations: canRejectDelegationRequests,
          canReceiveAffiliationRequests: canReceiveAffiliationReviewRequests,
          canApproveAffiliations: canApproveAffiliationRequests,
          canRejectAffiliations: canRejectAffiliationRequests,
          t,
          onAuthorizationRejected,
        }}
      >
        {children}
      </AccountSectionProvider>
    </section>
  );
}

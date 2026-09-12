"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { getAccountIdentifierFromIdentity, getAccountPrincipalIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { fetchAffiliations } from "@/gateways/account/accountBrowserApi";
import { canAccessAffiliations, canApproveAffiliations, canInviteAccountMembers, canManageAccountCategoryChangeRequests, canManagePrincipalGroups, canReceiveAffiliationRequests, canRejectAffiliations, canRequestAffiliation, canRequestDelegation, canUpdateAccount, hasAccountPolicy } from "@/gateways/account/accountPolicy";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import type { useI18n } from "../../../i18n/I18nProvider";
import { AccountSectionProvider } from "./AccountSectionContext";
import {
  adminSectionRoutes,
  adminAccountTabRoutes,
  type AdminAccountSettingsTab,
} from "../adminTypes";
import { adminQueryKeys } from "../queryKeys";

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
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
  onAuthorizationRejected: () => void;
};

export function AccountLayoutClient({
  activeTab,
  children,
  currentIdentity,
  t,
  onAuthorizationRejected,
}: AccountLayoutClientProps) {
  const router = useRouter();
  const accountIdentifier = getAccountIdentifierFromIdentity(currentIdentity);
  const accountPrincipalIdentifier = getAccountPrincipalIdentifierFromIdentity(currentIdentity);
  const canShowAccountSettings = Boolean(accountIdentifier) && hasAccountPolicy(currentIdentity);
  const canEdit = canUpdateAccount(currentIdentity);
  const canInvite = canInviteAccountMembers(currentIdentity);
  const canManageAccountPrincipalGroups = canManagePrincipalGroups(currentIdentity);
  const canManageCategoryChangeRequests = canManageAccountCategoryChangeRequests(currentIdentity);
  const canShowAffiliations = canAccessAffiliations(currentIdentity);
  const canCreateAffiliationRequest = canRequestAffiliation(currentIdentity);
  const canCreateDelegationRequest = canRequestDelegation(currentIdentity);
  const activeAffiliationsQuery = useQuery({
    enabled: canCreateDelegationRequest,
    queryFn: () => fetchAffiliations({
      fallbackErrorMessage: t.accountDelegations.loadFailed,
      status: "active",
    }),
    queryKey: adminQueryKeys.account.affiliations({ status: "active" }),
  });
  const hasActiveAffiliations = (activeAffiliationsQuery.data?.affiliations.length ?? 0) > 0;
  const isDelegationAccessLoading = canCreateDelegationRequest && activeAffiliationsQuery.isLoading;
  const hasDelegationAccessError = canCreateDelegationRequest && activeAffiliationsQuery.isError;
  const canShowDelegations = canCreateDelegationRequest && hasActiveAffiliations;
  const canReceiveAffiliationReviewRequests = canReceiveAffiliationRequests(currentIdentity);
  const canApproveAffiliationRequests = canApproveAffiliations(currentIdentity);
  const canRejectAffiliationRequests = canRejectAffiliations(currentIdentity);
  const fallbackTab: AdminAccountSettingsTab = "accountProfile";
  const fallbackRoute = adminAccountTabRoutes[fallbackTab];

  useEffect(() => {
    if (!canShowAccountSettings) {
      router.replace(adminSectionRoutes.wiki);
      return;
    }

    if (activeTab === "accountInvitations" && !canInvite) {
      router.replace(fallbackRoute);
      return;
    }

    if (activeTab === "principalGroupManagement" && !canManageAccountPrincipalGroups) {
      router.replace(fallbackRoute);
      return;
    }

    if (activeTab === "unapprovedAccountCategoryChangeRequests" && !canManageCategoryChangeRequests) {
      router.replace(fallbackRoute);
      return;
    }

    if (activeTab === "accountAffiliations" && !canShowAffiliations) {
      router.replace(fallbackRoute);
      return;
    }

    if (activeTab === "accountDelegations" && !isDelegationAccessLoading && !hasDelegationAccessError && !canShowDelegations) {
      router.replace(fallbackRoute);
    }
  }, [activeTab, canInvite, canManageAccountPrincipalGroups, canManageCategoryChangeRequests, canShowAccountSettings, canShowAffiliations, canShowDelegations, fallbackRoute, hasDelegationAccessError, isDelegationAccessLoading, router]);

  const tabs = [
    createAccountSettingsTab("accountProfile", t.accountInformationTab),
    createAccountSettingsTab("accountDocuments", t.accountDocuments.tab),
    ...(accountIdentifier ? [createAccountSettingsTab("accountCategoryChange", t.accountCategoryChange.tab)] : []),
    ...(canShowAffiliations ? [createAccountSettingsTab("accountAffiliations", t.accountAffiliations.tab)] : []),
    ...(canShowDelegations ? [createAccountSettingsTab("accountDelegations", t.accountDelegations.tab)] : []),
    ...(canInvite ? [createAccountSettingsTab("accountInvitations", t.accountInvitationsTab)] : []),
    ...(canManageAccountPrincipalGroups ? [createAccountSettingsTab("principalGroupManagement", t.principalGroupManagementTab)] : []),
    ...(canManageCategoryChangeRequests ? [createAccountSettingsTab("unapprovedAccountCategoryChangeRequests", t.accountCategoryChangeRequests.tab)] : []),
  ];
  const activeTabAllowed = tabs.some((tab) => tab.id === activeTab) ||
    (activeTab === "accountDelegations" && (isDelegationAccessLoading || hasDelegationAccessError));
  const selectedTab = activeTabAllowed ? activeTab : fallbackTab;

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
          accountPrincipalIdentifier,
          canEdit,
          canInvite,
          canManagePrincipalGroups: canManageAccountPrincipalGroups,
          canManageCategoryChangeRequests,
          canRequestAffiliation: canCreateAffiliationRequest,
          canRequestDelegation: canCreateDelegationRequest,
          canReceiveAffiliationRequests: canReceiveAffiliationReviewRequests,
          canApproveAffiliations: canApproveAffiliationRequests,
          canRejectAffiliations: canRejectAffiliationRequests,
          t,
          onAuthorizationRejected,
        }}
      >
        {activeTabAllowed ? children : null}
      </AccountSectionProvider>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { fetchAccount, inviteAccountMembers, updateAccount } from "@/gateways/account/accountBrowserApi";
import { canInviteAccountMembers, canManagePrincipalGroups, canUpdateAccount, hasAccountPolicy, isCorporationAccount } from "@/gateways/account/accountPolicy";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import { getAccountIdentifierFromIdentity, type WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { useI18n } from "../../../i18n/I18nProvider";
import { AccountSectionProvider } from "./AccountSectionContext";
import { accountInvitationEmailPattern, maxAccountInvitationEmails } from "./accountInvitationRules";
import {
  myPageSectionRoutes,
  myPageAccountTabRoutes,
  type MyPageAccountInvitationState,
  type MyPageAccountSettingsState,
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
  const [state, setState] = useState<MyPageAccountSettingsState>(() => ({
    account: null,
    accountName: "",
    error: null,
    isLoading: false,
    isSaving: false,
    success: null,
  }));
  const [invitationState, setInvitationState] = useState<MyPageAccountInvitationState>(() => ({
    emailInput: "",
    emails: [],
    error: null,
    isSending: false,
    success: null,
  }));

  const loadAccountSettings = useCallback(() => {
    if (!accountIdentifier || !canShowAccountSettings) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
      success: null,
    }));

    void fetchAccount({
      accountIdentifier,
      fallbackErrorMessage: t.accountSettingsLoadFailed,
    }).then((account) => {
      setState({
        account,
        accountName: account.name,
        error: null,
        isLoading: false,
        isSaving: false,
        success: null,
      });
    }).catch((error: unknown) => {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.accountSettingsLoadFailed,
        isLoading: false,
        success: null,
      }));
    });
  }, [accountIdentifier, canShowAccountSettings, t.accountSettingsLoadFailed]);

  useEffect(() => {
    if (!state.account && !state.isLoading) {
      // Account pages are URL-addressable, so direct visits need to hydrate the account panel.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAccountSettings();
    }
  }, [state.account, state.isLoading, loadAccountSettings]);

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

  const updateAccountNameField = (value: string) => {
    setState((current) => ({
      ...current,
      accountName: value,
      error: null,
      success: null,
    }));
  };

  const saveAccountSettings = () => {
    const accountName = state.accountName.trim();

    if (!accountIdentifier) {
      setState((current) => ({ ...current, error: t.accountSettingsUnavailable, success: null }));
      return;
    }

    if (!accountName) {
      setState((current) => ({ ...current, error: t.accountNameRequired, success: null }));
      return;
    }

    if (!canEdit) {
      setState((current) => ({ ...current, error: t.accountSettingsReadOnly, success: null }));
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isSaving: true,
      success: null,
    }));

    void updateAccount({
      accountIdentifier,
      fallbackErrorMessage: t.accountSettingsSaveFailed,
      requestBody: { accountName },
    }).then((account) => {
      setState({
        account,
        accountName: account.name,
        error: null,
        isLoading: false,
        isSaving: false,
        success: t.accountSettingsSaved,
      });
    }).catch((error: unknown) => {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.accountSettingsSaveFailed,
        isSaving: false,
        success: null,
      }));
    });
  };

  const updateInvitationEmailInput = (value: string) => {
    setInvitationState((current) => ({
      ...current,
      emailInput: value,
      error: null,
      success: null,
    }));
  };

  const addInvitationEmail = () => {
    const email = invitationState.emailInput.trim().toLowerCase();

    if (!email) {
      setInvitationState((current) => ({ ...current, error: t.accountInvitationEmailRequired, success: null }));
      return;
    }

    if (!accountInvitationEmailPattern.test(email)) {
      setInvitationState((current) => ({ ...current, error: t.accountInvitationEmailInvalid, success: null }));
      return;
    }

    if (invitationState.emails.includes(email)) {
      setInvitationState((current) => ({ ...current, error: t.accountInvitationEmailDuplicate, success: null }));
      return;
    }

    if (invitationState.emails.length >= maxAccountInvitationEmails) {
      setInvitationState((current) => ({ ...current, error: t.accountInvitationEmailLimit, success: null }));
      return;
    }

    setInvitationState((current) => ({
      ...current,
      emailInput: "",
      emails: [...current.emails, email],
      error: null,
      success: null,
    }));
  };

  const removeInvitationEmail = (email: string) => {
    setInvitationState((current) => ({
      ...current,
      emails: current.emails.filter((candidate) => candidate !== email),
      error: null,
      success: null,
    }));
  };

  const sendAccountInvitations = () => {
    if (!accountIdentifier || principalState.status !== "available") {
      setInvitationState((current) => ({ ...current, error: t.accountSettingsUnavailable, success: null }));
      return;
    }

    if (!canInvite) {
      setInvitationState((current) => ({ ...current, error: t.accountInvitationReadOnly, success: null }));
      return;
    }

    if (invitationState.emails.length === 0) {
      setInvitationState((current) => ({ ...current, error: t.accountInvitationEmailListRequired, success: null }));
      return;
    }

    setInvitationState((current) => ({
      ...current,
      error: null,
      isSending: true,
      success: null,
    }));

    void inviteAccountMembers({
      fallbackErrorMessage: t.accountInvitationSendFailed,
      requestBody: {
        accountIdentifier,
        inviterPrincipalIdentifier: principalState.principal.principalIdentifier,
        emails: invitationState.emails,
      },
    }).then(() => {
      setInvitationState({
        emailInput: "",
        emails: [],
        error: null,
        isSending: false,
        success: t.accountInvitationSent,
      });
    }).catch((error: unknown) => {
      setInvitationState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.accountInvitationSendFailed,
        isSending: false,
        success: null,
      }));
    });
  };

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
          canEdit,
          canManagePrincipalGroups: canManageAccountPrincipalGroups,
          invitationState,
          state,
          t,
          onAddInvitationEmail: addInvitationEmail,
          onAuthorizationRejected,
          onReload: loadAccountSettings,
          onRemoveInvitationEmail: removeInvitationEmail,
          onSave: saveAccountSettings,
          onSendInvitations: sendAccountInvitations,
          onUpdateAccountName: updateAccountNameField,
          onUpdateInvitationEmailInput: updateInvitationEmailInput,
        }}
      >
        {children}
      </AccountSectionProvider>
    </section>
  );
}

"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { useI18n } from "../../../i18n/I18nProvider";
import type {
  MyPageAccountInvitationState,
  MyPageAccountSettingsState,
} from "../myPageTypes";

export type AccountSectionContextValue = {
  canEdit: boolean;
  canManagePrincipalGroups: boolean;
  invitationState: MyPageAccountInvitationState;
  state: MyPageAccountSettingsState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onAddInvitationEmail: () => void;
  onAuthorizationRejected: () => void;
  onReload: () => void;
  onRemoveInvitationEmail: (email: string) => void;
  onSave: () => void;
  onSendInvitations: () => void;
  onUpdateAccountName: (value: string) => void;
  onUpdateInvitationEmailInput: (value: string) => void;
};

const AccountSectionContext = createContext<AccountSectionContextValue | null>(null);

export function AccountSectionProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AccountSectionContextValue;
}) {
  return (
    <AccountSectionContext.Provider value={value}>
      {children}
    </AccountSectionContext.Provider>
  );
}

export const useAccountSection = () => useContext(AccountSectionContext) as AccountSectionContextValue;

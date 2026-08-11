"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { useI18n } from "../../../i18n/I18nProvider";

export type AccountSectionContextValue = {
  accountIdentifier: string | null;
  accountPrincipalIdentifier: string | null;
  canEdit: boolean;
  canInvite: boolean;
  canManagePrincipalGroups: boolean;
  canManageCategoryChangeRequests: boolean;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
  onAuthorizationRejected: () => void;
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

"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import type { useI18n } from "../../../i18n/I18nProvider";

export type AccountSectionContextValue = {
  accountIdentifier: string | null;
  canEdit: boolean;
  canInvite: boolean;
  canManagePrincipalGroups: boolean;
  principalState: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
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

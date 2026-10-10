"use client";

import { createContext, useContext, type ReactNode } from "react";

import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { hasAccountPolicy } from "@/gateways/account/accountPolicy";
import { useAuthStore, type AuthIdentityRefresh } from "@/gateways/auth/authStore";
import { useI18n } from "../../i18n/I18nProvider";
import type { Locale } from "../../i18n/locales";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";

type AdminContextValue = {
  canShowAccountSettings: boolean;
  currentIdentity: AuthenticatedIdentitySummary;
  locale: Locale;
  refreshIdentity: AuthIdentityRefresh;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
};

const AdminContext = createContext<AdminContextValue | null>(null);

const canShowAccountSettingsForIdentity = (currentIdentity: AuthenticatedIdentitySummary) => {
  const accountIdentifier = getAccountIdentifierFromIdentity(currentIdentity);

  return Boolean(accountIdentifier) && hasAccountPolicy(currentIdentity);
};

export function AdminProvider({
  children,
  initialIdentity,
}: {
  children: ReactNode;
  initialIdentity: AuthenticatedIdentitySummary;
}) {
  const authIdentity = useAuthStore((state) => state.identity);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const currentIdentity = authIdentity ?? initialIdentity;
  const { dictionary, locale } = useI18n();

  return (
    <AdminContext.Provider
      value={{
        canShowAccountSettings: canShowAccountSettingsForIdentity(currentIdentity),
        currentIdentity,
        locale,
        refreshIdentity,
        t: dictionary.admin,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  return useContext(AdminContext) as AdminContextValue;
};

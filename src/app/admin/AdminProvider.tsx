"use client";

import { createContext, useContext, type ReactNode } from "react";

import { hasAccountPolicy } from "@/gateways/account/accountPolicy";
import { useAuthStore, type AuthIdentityRefresh } from "@/gateways/auth/authStore";
import { getAccountIdentifierFromIdentity } from "@/gateways/wiki/wikiPrincipal";
import { useI18n } from "../../i18n/I18nProvider";
import type { Locale } from "../../i18n/locales";
import type { AdminRouteContext } from "./adminTypes";

type AdminContextValue = AdminRouteContext & {
  canShowAccountSettings: boolean;
  currentIdentity: AdminRouteContext["initialIdentity"];
  locale: Locale;
  refreshIdentity: AuthIdentityRefresh;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
};

const AdminContext = createContext<AdminContextValue | null>(null);

const canShowAccountSettingsForIdentity = (currentIdentity: AdminRouteContext["initialIdentity"]) => {
  const accountIdentifier = getAccountIdentifierFromIdentity(currentIdentity);

  return Boolean(accountIdentifier) && hasAccountPolicy(currentIdentity);
};

export function AdminProvider({
  children,
  initialContext,
}: {
  children: ReactNode;
  initialContext: AdminRouteContext;
}) {
  const authIdentity = useAuthStore((state) => state.identity);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const currentIdentity = authIdentity ?? initialContext.initialIdentity;
  const { dictionary, locale } = useI18n();

  return (
    <AdminContext.Provider
      value={{
        ...initialContext,
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

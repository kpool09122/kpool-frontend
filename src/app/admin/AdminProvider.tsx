"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { hasAccountPolicy } from "@/gateways/account/accountPolicy";
import { useAuthStore, type AuthIdentityRefresh } from "@/gateways/auth/authStore";
import { useI18n } from "../../i18n/I18nProvider";
import type { Locale } from "../../i18n/locales";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { QueryProvider } from "../QueryProvider";
import { PrincipalAccessMonitor } from "./PrincipalAccessMonitor";
import { getAdminAccountScope } from "./accountScope";

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
  const authStatus = useAuthStore((state) => state.status);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const currentIdentity = authIdentity ?? (authStatus === "loading" && sessionVersion === 0 ? initialIdentity : null);
  const { dictionary, locale } = useI18n();
  const serverScope = getAdminAccountScope(initialIdentity);
  const currentScope = currentIdentity ? getAdminAccountScope(currentIdentity) : null;
  const previousServerScope = useRef(serverScope);

  useEffect(() => {
    if (previousServerScope.current === serverScope) return;
    previousServerScope.current = serverScope;
    if (authIdentity && currentScope !== serverScope) {
      void refreshIdentity({ preserveOnNull: true });
    }
  }, [authIdentity, currentScope, serverScope, refreshIdentity]);

  if (!currentIdentity) return null;

  if (currentScope !== serverScope) {
    return <p className="p-6 text-sm text-text-muted" role="status">{dictionary.header.switchingAccount}</p>;
  }

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
      <QueryProvider key={`${sessionVersion}:${currentScope}`}><PrincipalAccessMonitor identity={currentIdentity} refreshIdentity={refreshIdentity} t={dictionary.admin}>{children}</PrincipalAccessMonitor></QueryProvider>
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  return useContext(AdminContext) as AdminContextValue;
};

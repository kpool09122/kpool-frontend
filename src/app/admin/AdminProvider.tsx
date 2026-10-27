"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

import { useAuthStore, type AuthIdentityRefresh } from "@/gateways/auth/authStore";
import { useI18n } from "../../i18n/I18nProvider";
import type { Locale } from "../../i18n/locales";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import { useWikiPrincipalState } from "./useWikiPrincipalState";
import { QueryProvider } from "../QueryProvider";
import { PrincipalAccessMonitor } from "./PrincipalAccessMonitor";
import { getAdminAccountScope } from "./accountScope";
import { useVideoPlayback } from "@/components/VideoPlayback/VideoPlaybackProvider";
import { reconcilePrivatePlayback } from "./privatePlaybackAccess";

type AdminContextValue = {
  principalState: WikiPrincipalState;
  currentIdentity: AuthenticatedIdentitySummary;
  locale: Locale;
  refreshIdentity: AuthIdentityRefresh;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({
  children,
  initialIdentity,
  initialPrincipalState = { status: "idle" },
  principalStateUpdatedAt,
}: {
  children: ReactNode;
  initialIdentity: AuthenticatedIdentitySummary;
  initialPrincipalState?: WikiPrincipalState;
  principalStateUpdatedAt?: number;
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
    <QueryProvider key={`${sessionVersion}:${currentScope}`}>
      <AdminSession principalStateUpdatedAt={principalStateUpdatedAt} initialPrincipalState={initialPrincipalState} value={{ currentIdentity, locale, refreshIdentity, t: dictionary.admin }}>
        {children}
      </AdminSession>
    </QueryProvider>
  );
}

function AdminSession({ children, initialPrincipalState, principalStateUpdatedAt, value }: {
  children: ReactNode;
  initialPrincipalState: WikiPrincipalState;
  principalStateUpdatedAt?: number;
  value: Omit<AdminContextValue, "principalState">;
}) {
  const principalState = useWikiPrincipalState(value.currentIdentity, initialPrincipalState, principalStateUpdatedAt);
  const playback = useVideoPlayback()?.store;
  const principal = principalState.status === "available" && principalState.principal.status === "active" ? principalState.principal.principalIdentifier : null;
  useEffect(() => { if (playback) reconcilePrivatePlayback(playback, principal); }, [playback, principal]);
  return (
    <AdminContext.Provider value={{ ...value, principalState }}>
      <PrincipalAccessMonitor identity={value.currentIdentity} refreshIdentity={value.refreshIdentity} t={value.t}>
        {children}
      </PrincipalAccessMonitor>
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  return useContext(AdminContext) as AdminContextValue;
};

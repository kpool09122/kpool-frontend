"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { adminQueryKeys } from "./queryKeys";
import type { AdminRouteData } from "./adminTypes";
import { useAdmin } from "./AdminProvider";
import { getAdminAccountScope } from "./accountScope";
import { useI18n } from "../../i18n/I18nProvider";

const AdminRouteContext = createContext<AdminRouteData | null>(null);

export function AdminRouteProvider({ children, value }: { children: ReactNode; value: AdminRouteData }) {
  const { currentIdentity } = useAdmin();
  const { dictionary } = useI18n();
  const hydrationState = useMemo(() => {
    const client = new QueryClient();
    client.setQueryData(
      adminQueryKeys.principal.current(currentIdentity.identityIdentifier, getAccountIdentifierFromIdentity(currentIdentity)),
      value.initialPrincipalState,
      { updatedAt: value.principalStateUpdatedAt ?? 0 },
    );
    return dehydrate(client);
  }, [currentIdentity, value.initialPrincipalState, value.principalStateUpdatedAt]);

  if (value.accountScope !== getAdminAccountScope(currentIdentity)) {
    return <p className="p-6 text-sm text-text-muted" role="status">{dictionary.header.switchingAccount}</p>;
  }

  return <HydrationBoundary state={hydrationState}><AdminRouteContext.Provider value={value}>{children}</AdminRouteContext.Provider></HydrationBoundary>;
}

export const useAdminRouteData = () => useContext(AdminRouteContext) as AdminRouteData;

"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AdminRouteData } from "./adminTypes";
import { useAdmin } from "./AdminProvider";
import { getAdminAccountScope } from "./accountScope";
import { useI18n } from "../../i18n/I18nProvider";

const AdminRouteContext = createContext<AdminRouteData | null>(null);

export function AdminRouteProvider({ children, value }: { children: ReactNode; value: AdminRouteData }) {
  const { currentIdentity } = useAdmin();
  const { dictionary } = useI18n();

  if (value.accountScope !== getAdminAccountScope(currentIdentity)) {
    return <p className="p-6 text-sm text-text-muted" role="status">{dictionary.header.switchingAccount}</p>;
  }

  return <AdminRouteContext.Provider value={value}>{children}</AdminRouteContext.Provider>;
}

export const useAdminRouteData = () => useContext(AdminRouteContext) as AdminRouteData;

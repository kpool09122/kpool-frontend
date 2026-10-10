"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AdminRouteData } from "./adminTypes";

const AdminRouteContext = createContext<AdminRouteData | null>(null);

export function AdminRouteProvider({ children, value }: { children: ReactNode; value: AdminRouteData }) {
  return <AdminRouteContext.Provider value={value}>{children}</AdminRouteContext.Provider>;
}

export const useAdminRouteData = () => useContext(AdminRouteContext) as AdminRouteData;

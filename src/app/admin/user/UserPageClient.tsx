"use client";

import type { ReactNode } from "react";

import type { AdminSettingsTab } from "../adminTypes";
import { useAdmin } from "../AdminProvider";
import { UserLayoutClient } from "./UserLayoutClient";

export function UserPageClient({
  activeSettingsTab,
  children,
}: {
  activeSettingsTab: AdminSettingsTab;
  children: ReactNode;
}) {
  const {
    currentIdentity,
    locale,
    refreshIdentity,
    t,
  } = useAdmin();

  return (
    <UserLayoutClient
      activeSettingsTab={activeSettingsTab}
      currentIdentity={currentIdentity}
      locale={locale}
      t={t}
      onRefreshIdentity={() => refreshIdentity({ preserveOnNull: true })}
    >
      {children}
    </UserLayoutClient>
  );
}

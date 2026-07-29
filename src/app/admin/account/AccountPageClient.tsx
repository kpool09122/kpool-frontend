"use client";

import type { ReactNode } from "react";

import { AccountLayoutClient } from "./AccountLayoutClient";
import { useAdmin } from "../AdminProvider";
import type { AdminAccountSettingsTab } from "../adminTypes";

export function AccountPageClient({
  activeTab,
  children,
}: {
  activeTab: AdminAccountSettingsTab;
  children: ReactNode;
}) {
  const {
    currentIdentity,
    initialPrincipalState,
    refreshIdentity,
    t,
  } = useAdmin();

  return (
    <AccountLayoutClient
      activeTab={activeTab}
      currentIdentity={currentIdentity}
      principalState={initialPrincipalState}
      t={t}
      onAuthorizationRejected={() => {
        void refreshIdentity();
      }}
    >
      {children}
    </AccountLayoutClient>
  );
}

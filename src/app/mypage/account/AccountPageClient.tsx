"use client";

import type { ReactNode } from "react";

import { AccountLayoutClient } from "./AccountLayoutClient";
import { useMypage } from "../MypageProvider";
import type { MyPageAccountSettingsTab } from "../myPageTypes";

export function AccountPageClient({
  activeTab,
  children,
}: {
  activeTab: MyPageAccountSettingsTab;
  children: ReactNode;
}) {
  const {
    currentIdentity,
    initialPrincipalState,
    refreshIdentity,
    t,
  } = useMypage();

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

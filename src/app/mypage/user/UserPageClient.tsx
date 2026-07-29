"use client";

import type { ReactNode } from "react";

import type { MyPageSettingsTab } from "../myPageTypes";
import { useMypage } from "../MypageProvider";
import { UserLayoutClient } from "./UserLayoutClient";

export function UserPageClient({
  activeSettingsTab,
  children,
}: {
  activeSettingsTab: MyPageSettingsTab;
  children: ReactNode;
}) {
  const {
    currentIdentity,
    locale,
    refreshIdentity,
    t,
  } = useMypage();

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

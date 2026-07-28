"use client";

import { PrincipalGroupManagementPanel } from "../../PrincipalGroupManagementPanel";
import { useAccountSection } from "../AccountSectionContext";

export function AccountPrincipalGroupsClient() {
  const {
    canManagePrincipalGroups,
    t,
    onAuthorizationRejected,
  } = useAccountSection();

  return (
    <PrincipalGroupManagementPanel
      canManage={canManagePrincipalGroups}
      onAuthorizationRejected={onAuthorizationRejected}
      t={t}
    />
  );
}

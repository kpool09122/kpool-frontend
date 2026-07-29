"use client";

import { useAccountSection } from "../AccountSectionContext";
import { PrincipalGroupManagementPanel } from "./PrincipalGroupManagementPanel";
import { useAccountPrincipalGroups } from "./useAccountPrincipalGroups";

export function AccountPrincipalGroupsClient() {
  const {
    canManagePrincipalGroups,
    t,
    onAuthorizationRejected,
  } = useAccountSection();
  const principalGroups = useAccountPrincipalGroups({
    canManage: canManagePrincipalGroups,
    onAuthorizationRejected,
    t,
  });

  return (
    <PrincipalGroupManagementPanel
      canManage={canManagePrincipalGroups}
      principalGroups={principalGroups}
      t={t}
    />
  );
}

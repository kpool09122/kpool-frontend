"use client";
import { useEffect, useRef } from "react";
import { usePrincipalAccess } from "../../principal-groups/usePrincipalAccess";

import { useAccountSection } from "../AccountSectionContext";
import { PrincipalGroupManagementPanel } from "./PrincipalGroupManagementPanel";
import { useAccountPrincipalGroups } from "./useAccountPrincipalGroups";

export function AccountPrincipalGroupsClient() {
  const access = usePrincipalAccess("account");
  const {
    canManagePrincipalGroups,
    t,
  } = useAccountSection();
  const principalGroups = useAccountPrincipalGroups({
    canManage: canManagePrincipalGroups,
    ...access,
    t,
  });

  const { refreshAccess } = access;
  const refreshedError = useRef<string | null>(null);
  const errorScope = JSON.stringify([access.accountIdentifier, access.actorIdentifier, access.sessionVersion, principalGroups.accessStatus]);
  useEffect(() => {
    if (principalGroups.accessStatus !== 401 && principalGroups.accessStatus !== 403) { refreshedError.current = null; return; }
    if (refreshedError.current === errorScope) return;
    refreshedError.current = errorScope;
    void refreshAccess();
  }, [errorScope, principalGroups.accessStatus, refreshAccess]);

  return (
    <PrincipalGroupManagementPanel
      canManage={canManagePrincipalGroups}
      principalGroups={principalGroups}
      t={t}
    />
  );
}

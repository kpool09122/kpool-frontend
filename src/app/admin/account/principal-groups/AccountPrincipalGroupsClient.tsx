"use client";
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


  return (
    <PrincipalGroupManagementPanel
      canManage={canManagePrincipalGroups}
      principalGroups={principalGroups}
      t={t}
    />
  );
}

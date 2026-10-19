"use client";
import { useEffect, useRef } from "react";
import { usePrincipalAccess } from "../../principal-groups/usePrincipalAccess";




import { canShowWikiPrincipalGroupManagement } from "../../principalGroupVisibility";
import { useAdmin } from "../../AdminProvider";
import { useWikiSection } from "../WikiSectionProvider";
import { useWikiPrincipalGroups } from "./useWikiPrincipalGroups";
import { WikiPrincipalGroupManagementPanel } from "./WikiPrincipalGroupManagementPanel";

export function WikiPrincipalGroupsClient() {
  const access = usePrincipalAccess("wiki");

  const { principalState } = useWikiSection();
  const { t } = useAdmin();
  const canManage = principalState.status === "available" &&
    canShowWikiPrincipalGroupManagement(principalState.principal);
  const principalGroups = useWikiPrincipalGroups({
    canManage,
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
    <WikiPrincipalGroupManagementPanel
      canManage={canManage}
      principalGroups={principalGroups}
      t={t}
    />
  );
}

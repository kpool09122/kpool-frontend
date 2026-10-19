"use client";
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


  return (
    <WikiPrincipalGroupManagementPanel
      canManage={canManage}
      principalGroups={principalGroups}
      t={t}
    />
  );
}

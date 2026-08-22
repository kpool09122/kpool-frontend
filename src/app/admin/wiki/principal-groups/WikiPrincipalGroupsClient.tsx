"use client";

import { useRouter } from "next/navigation";

import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { canManageWikiPrincipalGroups } from "@/gateways/wiki/wikiPrincipal";
import { useAdmin } from "../../AdminProvider";
import { useWikiSection } from "../WikiSectionProvider";
import { useWikiPrincipalGroups } from "./useWikiPrincipalGroups";
import { WikiPrincipalGroupManagementPanel } from "./WikiPrincipalGroupManagementPanel";

export function WikiPrincipalGroupsClient() {
  const router = useRouter();
  const { principalState } = useWikiSection();
  const { currentIdentity, t } = useAdmin();
  const accountIdentifier = getAccountIdentifierFromIdentity(currentIdentity);
  const canManage = principalState.status === "available" &&
    canManageWikiPrincipalGroups(principalState.principal);
  const principalGroups = useWikiPrincipalGroups({
    accountIdentifier,
    canManage,
    onAuthorizationRejected: () => {
      router.replace("/admin/wiki/editing");
    },
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

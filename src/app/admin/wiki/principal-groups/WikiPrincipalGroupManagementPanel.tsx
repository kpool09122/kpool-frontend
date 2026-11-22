"use client";

import type { useI18n } from "@/i18n/I18nProvider";
import { PrincipalGroupManagementPanel, getPrincipalGroupPanelText } from "../../principal-groups/PrincipalGroupManagementPanel";
import type { useWikiPrincipalGroups } from "./useWikiPrincipalGroups";

export function WikiPrincipalGroupManagementPanel({ canManage, principalGroups, t }: {
  canManage: boolean;
  principalGroups: ReturnType<typeof useWikiPrincipalGroups>;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
}) {
  return <PrincipalGroupManagementPanel canManage={canManage} principalGroups={principalGroups} t={getPrincipalGroupPanelText(t)} />;
}

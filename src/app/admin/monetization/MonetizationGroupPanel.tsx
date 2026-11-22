"use client";

import type { MonetizationGroup, MonetizationMember } from "@/gateways/monetization/monetizationPrincipal";
import type { useI18n } from "@/i18n/I18nProvider";
import { PrincipalGroupManagementPanel, getPrincipalGroupPanelText } from "../principal-groups/PrincipalGroupManagementPanel";
import type { usePrincipalGroupEditor } from "../principal-groups/usePrincipalGroupEditor";

type Text = ReturnType<typeof useI18n>["dictionary"]["admin"];
export function MonetizationGroupPanel({ editor, t }: {
  editor: ReturnType<typeof usePrincipalGroupEditor<MonetizationGroup, MonetizationMember>>;
  t: Text;
}) {
  const labels = t.monetization;
  return <PrincipalGroupManagementPanel
    canManage
    principalGroups={{
      ...editor.actions,
      hasUnsavedChanges: editor.state.hasUnsavedChanges,
      isBusy: !editor.state.canManage,
      state: { ...editor.state, error: editor.state.saveError ?? editor.state.loadError },
    }}
    t={{
      ...getPrincipalGroupPanelText(t),
      loading: labels.loading,
      readOnly: labels.noPermission,
      noUsers: labels.empty,
      userListLabel: labels.members,
    }}
  />;
}

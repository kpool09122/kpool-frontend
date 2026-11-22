"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/gateways/auth/authStore";
import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { activateMonetization, canManageMonetization, fetchMonetizationGroups, saveMonetizationGroups } from "@/gateways/monetization/monetizationPrincipal";
import { useAdmin } from "../AdminProvider";
import { AdminSectionTabs } from "../AdminSectionTabs";
import { adminQueryKeys } from "../queryKeys";
import { usePrincipalAccess } from "../principal-groups/usePrincipalAccess";
import { usePrincipalGroupEditor } from "../principal-groups/usePrincipalGroupEditor";
import { MonetizationGroupPanel } from "./MonetizationGroupPanel";
import { useMonetizationPrincipal } from "./useMonetizationPrincipal";

export function MonetizationClient() {
  const { currentIdentity, refreshIdentity, t } = useAdmin();
  const auth = useAuthStore();
  const needsIdentity = auth.status === "loading" && auth.sessionVersion === 0 && !auth.identity;
  useEffect(() => { if (needsIdentity) void refreshIdentity(); }, [needsIdentity, refreshIdentity]);
  const identity = auth.identity;
  // Preserve same-scope workspace while refreshIdentity temporarily sets loading.
  if (!identity || identity.identityIdentifier !== currentIdentity.identityIdentifier || getAccountIdentifierFromIdentity(identity) !== getAccountIdentifierFromIdentity(currentIdentity) || identity.delegationIdentifier !== currentIdentity.delegationIdentifier) return <p role="status">{t.monetization.loading}</p>;
  const scope = JSON.stringify([identity.identityIdentifier, getAccountIdentifierFromIdentity(identity), identity.accountPrincipalIdentifier, identity.delegationIdentifier, auth.sessionVersion]);
  return <MonetizationWorkspace key={scope} scope={scope} />;
}

function MonetizationWorkspace({ scope }: { scope: string }) {
  const { currentIdentity, t: admin } = useAdmin();
  const t = admin.monetization;
  const access = usePrincipalAccess("monetization");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState(false);
  const operation = useRef({ mounted: false, busy: false });
  useEffect(() => {
    const token = { mounted: true, busy: false };
    operation.current = token;
    return () => { token.mounted = false; };
  }, []);
  const principal = useMonetizationPrincipal(currentIdentity, access.sessionVersion);
  const state = principal.data;
  const canManage = state?.status === "available" && canManageMonetization(state.principal, access.accountIdentifier ?? "");
  const editor = usePrincipalGroupEditor({
    scope,
    queryKey: adminQueryKeys.monetization.groups(access.accountIdentifier, access.actorIdentifier, access.sessionVersion),
    enabled: canManage,
    fetchList: () => fetchMonetizationGroups({ fallback: t.loadFailed }),
    saveList: payload => saveMonetizationGroups(payload, t.saveFailed),
    refreshAccess: access.refreshAccess,
    t: { ...admin.principalStatus, loadFailed: t.loadFailed, saveFailed: t.saveFailed, saved: t.saved },
  });
  const activate = async () => {
    const token = operation.current;
    if (!token.mounted || token.busy || state?.status !== "missing") return;
    token.busy = true; setActivating(true); setActivationError(false);
    const result = await activateMonetization();
    if (!token.mounted) return;
    if (result.ok || result.status === 409) await principal.refetch();
    else setActivationError(true);
    if (!token.mounted) return;
    token.busy = false; setActivating(false);
  };
  if (principal.isPending) return <p role="status">{t.loading}</p>;
  if (principal.isError || state?.status === "error") return <div role="alert" className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
    <p>{t.error}</p>
    <button type="button" className="mt-5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60" disabled={principal.isFetching} onClick={() => void principal.refetch()}>{t.retry}</button>
  </div>;
  if (state?.status === "missing") return (
    <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p className="mt-3 text-sm leading-7 text-text-muted">{t.description}</p>
      {activationError ? <p role="alert" className="mt-4">{t.activationFailed}</p> : null}
      <button type="button" className="mt-5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" disabled={activating} onClick={activate}>{activating ? t.activating : t.activate}</button>
    </div>
  );
  if (state?.status !== "available") return null;
  if (state.principal.status !== "active") return <section role="alert" className="rounded-xl border border-stroke-subtle bg-surface-raised p-6"><p>{t.stopped}</p></section>;
  return <section aria-label={admin.monetizationMenu} className="min-w-0 space-y-5">
    {canManage ? <AdminSectionTabs
      label={admin.monetizationMenu}
      tabs={[{ id: "principalGroups", label: admin.wikiPrincipalGroupManagementTab, href: "/admin/monetization/principal-groups" }]}
      activeTab="principalGroups"
    /> : null}
    {!canManage && editor.state.success ? <p role="status">{editor.state.success}</p> : null}
    {canManage ? <MonetizationGroupPanel editor={editor} t={admin} /> : null}
  </section>;
}

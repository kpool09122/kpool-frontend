"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/gateways/auth/authStore";
import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
import { activateMonetization, canManageMonetization, fetchMonetizationGroups, getMonetizationPrincipal, saveMonetizationGroups } from "@/gateways/monetization/monetizationPrincipal";
import { useAdmin } from "../AdminProvider";
import { adminQueryKeys } from "../queryKeys";
import { usePrincipalAccess } from "../principal-groups/usePrincipalAccess";
import { usePrincipalGroupEditor } from "../principal-groups/usePrincipalGroupEditor";
import { MonetizationGroupPanel } from "./MonetizationGroupPanel";

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
  const { t: admin } = useAdmin();
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
  const principal = useQuery({
    queryKey: adminQueryKeys.monetization.principal(access.accountIdentifier, access.actorIdentifier, access.sessionVersion),
    queryFn: ({ signal }) => getMonetizationPrincipal({ signal }),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
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
  return <section aria-label={t.title} className="min-w-0 space-y-5">
    <div className="space-y-4 rounded-xl border border-stroke-subtle bg-surface-raised p-5">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p className="text-sm leading-7 text-text-muted">{t.description}</p>
      {principal.isPending ? <p role="status">{t.loading}</p> : state?.status === "error" || principal.isError ? <div role="alert"><p>{t.error}</p><button type="button" className="mt-3 rounded-lg border p-2" disabled={principal.isFetching} onClick={() => void principal.refetch()}>{t.retry}</button></div> : state?.status === "missing" ? <>
        <p>{t.missing}</p>
        {activationError ? <p role="alert">{t.activationFailed}</p> : null}
        <button type="button" className="rounded-lg bg-brand-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-50" disabled={activating} onClick={activate}>{activating ? t.activating : t.activate}</button>
      </> : state?.status === "available" ? <p role="status">{state.principal.status === "active" ? t.active : t.stopped}</p> : null}
    </div>
    {editor.state.success ? <p role="status">{editor.state.success}</p> : null}
    {state?.status === "available" && state.principal.status === "active" && !canManage ? <p>{t.noPermission}</p> : null}
    {canManage ? <MonetizationGroupPanel editor={editor} t={t} statusText={admin.principalStatus} /> : null}
  </section>;
}

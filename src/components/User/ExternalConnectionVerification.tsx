"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import { RecentAuthenticationDialog } from "@/components/User/RecentAuthenticationDialog";
import { performRecentAuthentication, type RecentAuthenticationMethod } from "@/gateways/auth/recentAuthentication";
import { useAuthStore } from "@/gateways/auth/authStore";
import { webAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import { passkeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";
import { useI18n } from "@/i18n/I18nProvider";
import { oauthConnectionsDictionaries } from "@/i18n/oauthConnections";

const defaultNavigate = (url: string) => window.location.assign(url);

export function ExternalConnectionVerification({ returnTo, onVerified, beforeRedirect, navigate = defaultNavigate, panels }: {
  returnTo: "external-connections" | "authorization";
  onVerified: () => unknown;
  beforeRedirect?: () => void;
  navigate?: (url: string) => void;
  panels?: { title: string; description?: string }[];
}) {
  const { locale, dictionary } = useI18n();
  const t = oauthConnectionsDictionaries[locale];
  const identity = useAuthStore((state) => state.identity);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const select = async (method: RecentAuthenticationMethod) => {
    if (busy.current) return;
    busy.current = true;
    setOpen(false);
    setPending(true);
    setError(null);
    await performRecentAuthentication({ api: passkeyBrowserApi, method, returnTo, webAuthnAdapter: webAuthnBrowserAdapter }).then(async (result) => {
      if (!alive.current) return;
      if (result.status === "verified") await onVerified();
      else if (result.status === "redirect") {
        beforeRedirect?.();
        navigate(result.url);
      } else setError(result.kind === "cancelled" ? t.verificationCancelled : result.kind === "unsupported" ? dictionary.admin.passkeyUnsupported : result.message ?? t.failed);
    }).catch(() => setError(t.failed)).finally(() => {
      busy.current = false;
      setPending(false);
    });
  };
  const start = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    await refreshIdentity().then((refreshed) => {
      if (!alive.current) return;
      if (refreshed) setOpen(true);
      else setSessionExpired(true);
    }).catch(() => setError(t.failed)).finally(() => {
      busy.current = false;
      setPending(false);
    });
  };

  const content = <>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stroke-subtle bg-surface-base p-4">
      <p className="text-sm leading-6 text-text-muted">{t.verificationRequired}</p>
      {sessionExpired ? (
        <Link className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary" href={`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>{t.login}</Link>
      ) : (
        <button type="button" disabled={pending} onClick={() => void start()} className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60">
          {pending ? dictionary.admin.passkeyVerifying : dictionary.admin.passkeyVerify}
        </button>
      )}
    </div>
    {sessionExpired || error ? <UserStatusMessage variant="error">{sessionExpired ? t.session : error}</UserStatusMessage> : null}
  </>;

  return <>
    {panels ? panels.map(({ title, description }) => (
      <UserSettingsPanel key={title} title={title} description={description}>
        <div className="mt-5 space-y-4">{content}</div>
      </UserSettingsPanel>
    )) : content}
    {open ? <RecentAuthenticationDialog passkeyCount={identity?.authenticationMethods?.passkeyCount ?? 0} linkedSocialProviders={identity?.authenticationMethods?.linkedSocialProviders ?? []} onClose={() => setOpen(false)} onSelect={(method) => void select(method)} /> : null}
  </>;
}

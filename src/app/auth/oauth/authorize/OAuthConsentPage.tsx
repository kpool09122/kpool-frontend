"use client";

import Link from "next/link";
import { ArrowRight, Blocks, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDeadlineTime } from "@/components/useDeadlineTime";
import { oauthConsentBrowserApi, type OAuthConsentBrowserApi, type ConsentDetails, type ConsentScope } from "@/gateways/identity/oauthConsentBrowserApi";
import { useI18n } from "@/i18n/I18nProvider";

const defaultNavigate = (url: string) => window.location.replace(url);
type ErrorKind = "changed" | "forbidden" | "invalid" | "failed" | "invalidInput" | "session";
const errorKind = (status: number): ErrorKind => status === 401 || status === 419 ? "session"
  : status === 403 ? "forbidden" : status === 404 || status === 409 ? "invalid"
  : status === 400 || status === 422 ? "invalidInput" : "failed";

export function OAuthConsentPage({ query, api = oauthConsentBrowserApi, navigate = defaultNavigate }: {
  query: string; api?: OAuthConsentBrowserApi; navigate?: (url: string) => void;
}) {
  const { locale, dictionary } = useI18n();
  const t = dictionary.oauthConsent;
  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [selection, setSelection] = useState<ConsentScope[]>([]);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [pending, setPending] = useState(true);
  const [complete, setComplete] = useState(false);
  const busy = useRef(false);
  const alive = useRef(false);
  // A single promise per mounted authorization entry: React StrictMode must not POST twice.
  const initialization = useRef<ReturnType<OAuthConsentBrowserApi["start"]> | null>(null);
  const initialLocale = useRef(locale);
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    initialization.current ??= api.start(query, initialLocale.current);
    void initialization.current.then((result) => {
      if (cancelled) return;
      if (result.ok) setDetails(result.data);
      else setError(errorKind(result.status));
    }).catch(() => { if (!cancelled) setError("failed"); }).finally(() => { if (!cancelled) setPending(false); });
    return () => { cancelled = true; alive.current = false; };
  }, [api, query]);
  const now = useDeadlineTime(details && !complete ? new Date(details.expiresAt).getTime() : null);
  const expired = details !== null && new Date(details.expiresAt).getTime() <= now;
  const blocked = expired || complete || error === "invalid" || error === "forbidden" || error === "session";
  const returnTo = `/auth/oauth/authorize?${query}`;
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const submit = async (action: "approve" | "deny") => {
    if (busy.current || pending || blocked || !details || new Date(details.expiresAt).getTime() <= Date.now()) return;
    const selected = details.scopes.map((item) => item.scope).filter((scope) => selection.includes(scope));
    if (action === "approve" && selected.length === 0) return;
    busy.current = true; setPending(true); setError(null);
    await (action === "approve" ? api.approve(details.requestIdentifier, selected, locale) : api.deny(details.requestIdentifier, locale)).then(async (result) => {
      if (!alive.current) return;
      if (result.ok) { setComplete(true); navigate(result.data.redirectUri); return; }
      if (action === "approve" && result.status === 400) {
        // Settings are authoritative only on the server. Never resubmit the old selection automatically.
        setSelection([]);
        const refreshed = await api.get(details.requestIdentifier, locale);
        if (!alive.current) return;
        if (refreshed.ok) { setDetails(refreshed.data); setError("changed"); }
        else setError(errorKind(refreshed.status));
      } else setError(errorKind(result.status));
    }).catch(() => { if (alive.current) setError("failed"); }).finally(() => {
      busy.current = false; if (alive.current) setPending(false);
    });
  };
  const shownError = expired ? "invalid" : error;
  const hasScopes = details !== null && details.scopes.length > 0;
  const bulkActionClass = "min-h-11 rounded px-1 text-sm text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline disabled:opacity-50";
  const actionClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary";
  return <main className="flex-1 bg-surface-base px-4 py-8 text-text-strong sm:px-8 sm:py-16">
    <section aria-label={t.title} className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-raised shadow-soft">
      <header className="px-6 pt-8 pb-6 sm:px-8">
        <div aria-hidden="true" className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-stroke-subtle bg-surface-base"><Blocks className="h-6 w-6 text-brand-primary" /></span>
          <ArrowRight className="h-4 w-4 text-text-muted" />
          <span className="text-lg font-bold tracking-tight">k-pool</span>
        </div>
        <p className="mb-3 text-xs font-semibold tracking-wide text-text-muted">{t.title}</p>
        <h1 className="text-2xl font-bold leading-snug [overflow-wrap:anywhere] sm:text-3xl">
          {details ? <><span className="block">{details.clientName}</span><span className="mt-2 block text-base font-medium leading-relaxed text-text-muted">{t.request}</span></> : t.introduction}
        </h1>
      </header>
      <div className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
        {pending ? <p role="status" className="text-sm text-text-muted">{details ? t.sending : t.loading}</p> : null}
        {complete ? <p role="status" className="text-sm text-text-muted">{t.complete}</p> : null}
        {details && !complete ? hasScopes ? <>
          <fieldset disabled={pending || blocked} className="min-w-0 disabled:opacity-60">
            <legend className="mb-3 text-sm font-semibold">{t.scopesTitle}</legend>
            <div className="mb-1 flex flex-wrap justify-end gap-4">
              <button type="button" disabled={details.scopes.every(({ scope }) => selection.includes(scope))} onClick={() => setSelection(details.scopes.map(({ scope }) => scope))} className={bulkActionClass}>{t.selectAll}</button>
              <button type="button" disabled={selection.length === 0} onClick={() => setSelection([])} className={bulkActionClass}>{t.clearAll}</button>
            </div>
            <div className="divide-y divide-stroke-subtle border-y border-stroke-subtle">
              {details.scopes.map(({ scope, description }) => <label key={scope} className="flex min-h-12 cursor-pointer items-start gap-3 px-1 py-3 transition-colors hover:bg-surface-base has-[:disabled]:cursor-default">
                <input type="checkbox" checked={selection.includes(scope)} onChange={(event) => setSelection((previous) => event.target.checked ? [...previous, scope] : previous.filter((item) => item !== scope))} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary" />
                <span className="min-w-0 text-sm leading-6 [overflow-wrap:anywhere]">{t.descriptions[scope] ?? description}</span>
              </label>)}
            </div>
          </fieldset>
          <div className="space-y-2 rounded-xl bg-surface-base p-4 text-xs leading-6 text-text-muted"><p>{t.accounts}</p><p>{t.business}</p></div>
        </> : <div className="rounded-xl border border-stroke-subtle bg-surface-base p-5">
          <SlidersHorizontal aria-hidden="true" className="mb-3 h-5 w-5 text-text-muted" />
          <h2 className="font-semibold">{t.emptyTitle}</h2>
          <p className="mt-2 text-sm leading-7 text-text-muted">{t.empty}</p>
        </div> : null}
        {!complete && shownError ? <p role="alert" className="rounded-xl border border-stroke-subtle bg-surface-base p-4 text-sm leading-6">{t[shownError]}</p> : null}
        {shownError === "session" ? <Link href={loginHref} className="inline-flex min-h-11 items-center text-brand-primary underline underline-offset-4">{t.login}</Link> : null}
        {!complete && shownError && shownError !== "session" ? <button type="button" disabled={pending} onClick={() => window.location.reload()} className="min-h-12 text-sm text-brand-primary underline underline-offset-4">{t.restart}</button> : null}
      </div>
      {details && !complete ? <footer className="flex flex-col gap-3 border-t border-stroke-subtle px-6 py-5 sm:flex-row-reverse sm:px-8">
        {hasScopes ? <button type="button" disabled={pending || blocked || selection.length === 0} onClick={() => void submit("approve")} className={`${actionClass} bg-brand-primary text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-1`}>{t.approve}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button> : null}
        <button type="button" disabled={pending || blocked} onClick={() => void submit("deny")} className={`${actionClass} border border-stroke-subtle hover:bg-surface-base disabled:cursor-not-allowed disabled:opacity-40`}>{t.cancel}</button>
      </footer> : null}
    </section>
  </main>;
}

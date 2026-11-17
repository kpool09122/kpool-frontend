"use client";

import Link from "next/link";
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
  return <main className="flex-1 bg-surface-base px-6 py-10 text-text-strong sm:px-10">
    <section aria-labelledby="consent-title" className="mx-auto max-w-2xl space-y-5 rounded-lg border border-stroke-subtle bg-surface-raised p-6">
      <h1 id="consent-title" className="text-3xl font-bold">{t.title}</h1>
      <p>{t.introduction}</p>
      {pending ? <p role="status">{details ? t.sending : t.loading}</p> : null}
      {complete ? <p role="status">{t.complete}</p> : null}
      {details && !complete ? <>
        <h2 className="break-words text-xl font-semibold">{details.clientName}</h2>
        <p className="text-sm leading-6">{t.accounts}</p><p className="text-sm leading-6">{t.business}</p>
        <fieldset disabled={pending || blocked} className="space-y-3">
          <legend className="mb-3 font-semibold">{t.scopesTitle}</legend>
          {details.scopes.map(({ scope, description }) => <label key={scope} className="flex min-h-12 items-start gap-3 break-words">
            <input type="checkbox" checked={selection.includes(scope)} onChange={(event) => setSelection((previous) => event.target.checked ? [...previous, scope] : previous.filter((item) => item !== scope))} className="mt-1 h-5 w-5 shrink-0" />
            <span><span className="block font-semibold">{scope}</span>{t.descriptions[scope] ?? description}</span>
          </label>)}
        </fieldset>
        {details.scopes.length === 0 ? <p>{t.empty}</p> : null}
        <Link href="/admin/user/security" className="inline-flex min-h-11 items-center text-brand-primary underline">{t.settings}</Link>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={pending || blocked || selection.length === 0} onClick={() => void submit("approve")} className="min-h-12 rounded-lg bg-brand-primary px-6 font-semibold text-on-primary disabled:opacity-50">{t.approve}</button>
          <button type="button" disabled={pending || blocked} onClick={() => void submit("deny")} className="min-h-12 rounded-lg border border-stroke-subtle px-6 disabled:opacity-50">{t.cancel}</button>
        </div>
      </> : null}
      {!complete && shownError ? <p role="alert">{t[shownError]}</p> : null}
      {shownError === "session" ? <Link href={loginHref} className="text-brand-primary underline">{t.login}</Link> : null}
      {!complete && shownError && shownError !== "session" ? <button type="button" disabled={pending} onClick={() => window.location.reload()} className="min-h-12 text-brand-primary underline">{t.restart}</button> : null}
    </section>
  </main>;
}

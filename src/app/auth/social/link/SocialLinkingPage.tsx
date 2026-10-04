"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useEmailSendingStatus } from "@/components/auth/useEmailSendingStatus";
import { identityProviders } from "@/gateways/auth/authFlow";
import { useAuthStore } from "@/gateways/auth/authStore";
import {
  socialLinkingBrowserApi,
  type SocialLinkingBrowserApi,
  type SocialLinkingSession,
} from "@/gateways/identity/socialLinkingBrowserApi";
import { useI18n } from "@/i18n/I18nProvider";

type SocialLinkingPageProps = {
  api?: SocialLinkingBrowserApi;
  navigate?: (url: string) => void;
};

const defaultNavigate = (url: string) => window.location.replace(url);
const safeDestination = (value: string) =>
  value.startsWith("/") && !value.startsWith("//") && !/[\\\u0000-\u0020\u007f]/.test(value)
    ? value
    : "/admin";

export function SocialLinkingPage({ api = socialLinkingBrowserApi, navigate = defaultNavigate }: SocialLinkingPageProps) {
  const { locale, dictionary } = useI18n();
  const t = dictionary.socialLinking;
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const [session, setSession] = useState<SocialLinkingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [authCode, setAuthCode] = useState("");
  const [pending, setPending] = useState<"send" | "verify" | null>(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<"invalidSession" | "loadFailed" | "sendFailed" | "verifyFailed" | null>(null);
  const [now, setNow] = useState(Date.now);
  const sendingStatus = useEmailSendingStatus(
    "kpool.social-linking.email-sending-status",
    session?.expiresAt ?? null,
  );
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    api.get(locale).then((result) => {
      if (!active) return;
      if (result.ok) {
        setSession(result.data);
        setError(null);
      } else {
        setSession(null);
        setError(result.status === 422 ? "invalidSession" : "loadFailed");
      }
    }).catch(() => {
      if (active) setError("loadFailed");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [api, locale]);

  useEffect(() => {
    if (!session || complete) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session, complete]);

  const expired = session !== null && new Date(session.expiresAt).getTime() <= now;
  const displayedError = expired ? "invalidSession" : error;
  const unavailable = !session || expired || error === "invalidSession";
  const secondsUntilResend = sendingStatus.secondsUntilRetry ?? 0;
  const requested = sendingStatus.status !== null;
  const provider = identityProviders.find((item) => item.id === session?.provider)?.label ?? session?.provider;

  const canStart = () => !busy.current && !complete && !unavailable
    && session !== null && new Date(session.expiresAt).getTime() > Date.now();

  const sendEmail = async () => {
    if (!canStart() || sendingStatus.retryUnavailable || secondsUntilResend > 0) return;
    busy.current = true;
    setPending("send");
    setError(null);
    await api.sendEmail(locale).then((result) => {
      if (result.ok && result.data.accepted) {
        sendingStatus.update(result.data);
      } else {
        setError(!result.ok && result.status === 422 ? "invalidSession" : "sendFailed");
      }
    }).catch(() => setError("sendFailed")).finally(() => {
      busy.current = false;
      setPending(null);
    });
  };

  const verifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canStart() || !/^[0-9]{6}$/.test(authCode)) return;
    busy.current = true;
    setPending("verify");
    setError(null);
    await api.verifyEmail(authCode, locale).then(async (result) => {
      if (result.ok) {
        setComplete(true);
        setAuthCode("");
        // Verification consumes the operation. Navigate even if refreshing the header fails.
        await refreshIdentity().catch(() => null);
        navigate(safeDestination(result.data.redirectUrl));
        return;
      }
      // A wrong code is retryable; expiry, exhausted attempts, and consumed operations are not.
      const current = await api.get(locale);
      setError(!current.ok && current.status === 422 ? "invalidSession" : "verifyFailed");
      if (current.ok) setSession(current.data);
    }).catch(() => setError("verifyFailed")).finally(() => {
      busy.current = false;
      setPending(null);
    });
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-7">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">{dictionary.common.accountBrand}</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
          <p className="text-sm leading-6 text-text-muted">{t.description}</p>
        </div>
        {loading ? <p role="status">{t.loading}</p> : null}
        {complete ? <p role="status">{t.complete}</p> : null}
        {!loading && session && !complete ? (
          <section className="space-y-5 rounded-lg border border-stroke-subtle bg-surface-raised p-6">
            <dl className="space-y-3">
              <div><dt className="text-sm text-text-muted">{t.provider}</dt><dd className="font-semibold">{provider}</dd></div>
              <div><dt className="text-sm text-text-muted">{t.email}</dt><dd className="break-all font-semibold">{session.email}</dd></div>
            </dl>
            <p className="text-sm leading-6 text-text-muted">{t.instructions}</p>
            <button type="button" disabled={pending !== null || unavailable || sendingStatus.retryUnavailable || secondsUntilResend > 0}
              className="min-h-12 w-full rounded-lg border border-brand-primary px-5 font-semibold text-brand-primary disabled:opacity-60"
              onClick={() => void sendEmail()}>
              {pending === "send" ? t.sending : secondsUntilResend > 0 ? t.resendWait(secondsUntilResend) : requested ? t.resendCode : t.sendCode}
            </button>
            {requested ? (
              <div role="status" className="space-y-1 text-sm leading-6 text-text-muted">
                <p>{t.sendAccepted}</p>
                <p>{t.remainingSends(sendingStatus.remainingSends ?? 0)}</p>
                {sendingStatus.retryUnavailable ? <p>{t.restartRequired}</p> : null}
              </div>
            ) : null}
            <form onSubmit={verifyEmail} className="space-y-4">
              <label className="block space-y-2 text-sm font-semibold">
                <span>{t.authCode}</span>
                <input value={authCode} onChange={(event) => setAuthCode(event.target.value)} required
                  disabled={pending !== null || unavailable} inputMode="numeric" autoComplete="one-time-code"
                  pattern="[0-9]{6}" minLength={6} maxLength={6}
                  className="min-h-12 w-full rounded-lg border border-stroke-subtle bg-surface-base px-4" />
              </label>
              <button type="submit" disabled={pending !== null || unavailable || !/^[0-9]{6}$/.test(authCode)}
                className="min-h-12 w-full rounded-lg bg-brand-primary px-5 font-semibold text-white disabled:opacity-60">
                {pending === "verify" ? t.verifying : t.verifyCode}
              </button>
            </form>
          </section>
        ) : null}
        {!complete && displayedError ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {t[displayedError]}
          </p>
        ) : null}
        <Link href="/login" className="inline-flex text-sm font-semibold text-brand-primary underline-offset-4 hover:underline">{t.backToLogin}</Link>
      </div>
    </main>
  );
}

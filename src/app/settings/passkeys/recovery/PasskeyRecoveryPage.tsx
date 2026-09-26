"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { identityProviders, type IdentityProvider } from "@/gateways/auth/authFlow";
import {
  recoverPasskey,
  type PasskeyRecoveryAdapter,
} from "@/gateways/auth/passkeyRecoveryFlow";
import { passkeyBrowserApi, type PasskeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";
import { useI18n } from "../../../../i18n/I18nProvider";

type RecoveryPhase = "method" | "verification" | "confirm" | "complete";

type PasskeyRecoveryPageProps = {
  api?: PasskeyBrowserApi;
  initialRecoveryKey?: string | null;
  navigate?: (url: string) => void;
  recoveryAdapter?: PasskeyRecoveryAdapter;
};

const identityIdentifierPattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
const identityIdentifierRegex = new RegExp(`^${identityIdentifierPattern}$`);

export function PasskeyRecoveryPage({
  api = passkeyBrowserApi,
  initialRecoveryKey = null,
  navigate = (url) => window.location.assign(url),
  recoveryAdapter = recoverPasskey,
}: PasskeyRecoveryPageProps) {
  const { locale, dictionary } = useI18n();
  const t = dictionary.passkeyRecovery;
  const [phase, setPhase] = useState<RecoveryPhase>(initialRecoveryKey ? "confirm" : "method");
  const [identityIdentifier, setIdentityIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [recoveryKey, setRecoveryKey] = useState(initialRecoveryKey ?? "");
  const [displayName, setDisplayName] = useState(t.defaultPasskeyName);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const identityIdentifierIsValid = identityIdentifierRegex.test(identityIdentifier);

  useEffect(() => {
    if (initialRecoveryKey && window.location.search) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, [initialRecoveryKey]);

  const startSocialRecovery = async (provider: IdentityProvider["id"]) => {
    if (pending) return;
    setPending(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    const result = await api.createRecoverySocialRedirect(provider, identityIdentifier, locale);

    if (result.ok) {
      navigate(result.data.redirectUrl);
      return;
    }

    setErrorMessage(t.ssoFailed);
    setPending(false);
  };

  const sendEmail = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (pending) return;
    setPending(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    const result = await api.sendRecoveryEmail({ email }, locale);

    if (result.ok) {
      setPhase("verification");
      setNoticeMessage(t.emailSentGeneric);
    } else {
      setErrorMessage(t.emailSendFailed);
    }
    setPending(false);
  };

  const verifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    const result = await api.verifyRecoveryEmail({ email, authCode }, locale);

    if (result.ok) {
      setRecoveryKey(result.data.recoveryKey);
      setPhase("confirm");
    } else {
      setErrorMessage(t.verificationFailed);
    }
    setPending(false);
  };

  const registerReplacement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !confirmed) return;
    setPending(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    const result = await recoveryAdapter({
      api,
      displayName,
      language: locale,
      recoveryKey,
    });

    if (result.ok) {
      setPhase("complete");
      setRecoveryKey("");
      setAuthCode("");
    } else if (result.reason === "cancelled") {
      setNoticeMessage(t.passkeyCancelled);
    } else if (result.reason === "unsupported") {
      setErrorMessage(t.passkeyUnsupported);
    } else {
      setErrorMessage(t.passkeyFailed);
    }
    setPending(false);
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-7">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">
            {dictionary.common.accountBrand}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
          <p className="text-sm leading-6 text-text-muted">{t.description}</p>
        </div>

        {phase === "method" ? (
          <div className="space-y-6">
            <section className="space-y-4 rounded-lg border border-stroke-subtle bg-surface-raised p-6">
              <div>
                <h2 className="text-xl font-bold">{t.ssoTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">{t.ssoDescription}</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="recovery-identity-id" className="block text-sm font-semibold">
                  {t.identityIdentifier}
                </label>
                <input
                  id="recovery-identity-id"
                  type="text"
                  value={identityIdentifier}
                  required
                  pattern={identityIdentifierPattern}
                  autoComplete="off"
                  aria-describedby="recovery-identity-id-help"
                  className="min-h-12 w-full rounded-lg border border-stroke-subtle bg-surface-base px-4"
                  onChange={(event) => setIdentityIdentifier(event.target.value)}
                />
                <p id="recovery-identity-id-help" className="text-xs text-text-muted">{t.identityIdentifierHelp}</p>
              </div>
              <div className="grid gap-3" aria-label={t.ssoTitle}>
                {identityProviders.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={pending || !identityIdentifierIsValid}
                    className="flex min-h-12 items-center justify-center gap-3 rounded-lg border border-stroke-subtle bg-surface-base px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void startSocialRecovery(provider.id)}
                  >
                    <Image src={provider.iconSrc} alt="" width={32} height={32} aria-hidden="true" />
                    {provider.label}{t.ssoButtonSuffix}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-stroke-subtle bg-surface-raised p-6">
              <div>
                <h2 className="text-xl font-bold">{t.emailTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">{t.emailDescription}</p>
              </div>
              <form className="space-y-4" onSubmit={sendEmail}>
                <label className="block space-y-2 text-sm font-semibold">
                  <span>{t.email}</span>
                  <input
                    type="email"
                    value={email}
                    required
                    autoComplete="email"
                    className="min-h-12 w-full rounded-lg border border-stroke-subtle bg-surface-base px-4"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={pending} className="min-h-12 w-full rounded-lg bg-brand-primary px-5 font-semibold text-white disabled:opacity-60">
                  {pending ? t.sending : t.sendCode}
                </button>
              </form>
            </section>
          </div>
        ) : null}

        {phase === "verification" ? (
          <section className="space-y-5 rounded-lg border border-stroke-subtle bg-surface-raised p-6">
            <div>
              <h2 className="text-xl font-bold">{t.verificationTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">{t.verificationDescription(email)}</p>
            </div>
            <form className="space-y-4" onSubmit={verifyEmail}>
              <label className="block space-y-2 text-sm font-semibold">
                <span>{t.authCode}</span>
                <input
                  value={authCode}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={6}
                  className="min-h-12 w-full rounded-lg border border-stroke-subtle bg-surface-base px-4"
                  onChange={(event) => setAuthCode(event.target.value)}
                />
              </label>
              <button type="submit" disabled={pending} className="min-h-12 w-full rounded-lg bg-brand-primary px-5 font-semibold text-white disabled:opacity-60">
                {pending ? t.verifying : t.verifyCode}
              </button>
            </form>
            <button type="button" disabled={pending} className="text-sm font-semibold text-brand-primary underline-offset-4 hover:underline" onClick={() => void sendEmail()}>
              {t.resendCode}
            </button>
          </section>
        ) : null}

        {phase === "confirm" ? (
          <section className="space-y-5 rounded-lg border border-red-300 bg-surface-raised p-6">
            <div>
              <h2 className="text-xl font-bold">{t.confirmTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">{t.confirmDescription}</p>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm font-semibold text-red-700">
              <li>{t.deleteAllPasskeysWarning}</li>
              <li>{t.logoutAllSessionsWarning}</li>
              <li>{t.keepSsoWarning}</li>
              <li>{t.loginAgainWarning}</li>
            </ul>
            <form className="space-y-4" onSubmit={registerReplacement}>
              <label className="block space-y-2 text-sm font-semibold">
                <span>{t.passkeyDisplayName}</span>
                <input
                  value={displayName}
                  required
                  minLength={1}
                  maxLength={64}
                  className="min-h-12 w-full rounded-lg border border-stroke-subtle bg-surface-base px-4"
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
              <label className="flex items-start gap-3 text-sm font-semibold">
                <input type="checkbox" checked={confirmed} className="mt-1" onChange={(event) => setConfirmed(event.target.checked)} />
                <span>{t.confirmCheckbox}</span>
              </label>
              <button type="submit" disabled={pending || !confirmed} className="min-h-12 w-full rounded-lg bg-red-700 px-5 font-semibold text-white disabled:opacity-60">
                {pending ? t.recovering : t.recover}
              </button>
            </form>
          </section>
        ) : null}

        {phase === "complete" ? (
          <section className="space-y-4 rounded-lg border border-emerald-300 bg-surface-raised p-6" role="status">
            <h2 className="text-xl font-bold">{t.completeTitle}</h2>
            <p className="text-sm leading-6 text-text-muted">{t.completeDescription}</p>
            <Link href="/login" className="inline-flex min-h-12 items-center rounded-lg bg-brand-primary px-5 font-semibold text-white">
              {t.loginAgain}
            </Link>
          </section>
        ) : null}

        {noticeMessage ? <p role="status" className="rounded-lg border border-stroke-subtle bg-surface-raised px-4 py-3 text-sm">{noticeMessage}</p> : null}
        {errorMessage ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</p> : null}

        {phase !== "complete" ? (
          <Link href="/login" className="inline-flex text-sm font-semibold text-brand-primary underline-offset-4 hover:underline">
            {t.backToLogin}
          </Link>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

import {
  identityProviders,
  loginWithPasskey,
  normalizeReturnTo,
  requestSocialRedirect,
  type IdentityProvider,
  type PasskeyLoginAdapter,
  type SocialRedirectAdapter,
} from "@/gateways/auth/authFlow";
import { useAuthStore } from "@/gateways/auth/authStore";
import { webAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import { useI18n } from "../../i18n/I18nProvider";

type LoginPageProps = {
  loginAdapter?: PasskeyLoginAdapter;
  socialRedirectAdapter?: SocialRedirectAdapter;
  navigate?: (url: string) => void;
  refresh?: () => void;
  returnTo?: string | null;
  webAuthnSupported?: boolean;
};

type PendingAction =
  | { type: "passkey" }
  | { type: "social"; provider: IdentityProvider["id"] }
  | null;

const getSocialButtonClassName = (provider: IdentityProvider): string =>
  [
    "flex min-h-12 items-center justify-center gap-3 rounded-lg px-5 py-0 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
    provider.buttonClassName,
  ].join(" ");

const defaultNavigate = (url: string): void => {
  window.location.assign(url);
};

const subscribeToWebAuthnSupport = (): (() => void) => () => undefined;
const getServerWebAuthnSupport = (): null => null;

const getCurrentReturnTo = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("returnTo");
};

export function LoginPage({
  loginAdapter = loginWithPasskey,
  socialRedirectAdapter = requestSocialRedirect,
  navigate,
  refresh,
  returnTo,
  webAuthnSupported,
}: LoginPageProps) {
  const router = useRouter();
  const { locale, dictionary } = useI18n();
  const t = dictionary.login;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const detectedWebAuthnSupport = useSyncExternalStore<boolean | null>(
    subscribeToWebAuthnSupport,
    webAuthnBrowserAdapter.isSupported,
    getServerWebAuthnSupport,
  );
  const isWebAuthnSupported = webAuthnSupported ?? detectedWebAuthnSupport;
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const destination = useMemo(
    () => normalizeReturnTo(returnTo ?? getCurrentReturnTo()),
    [returnTo],
  );

  const handlePasskeyLogin = async () => {
    if (pendingAction) {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setPendingAction({ type: "passkey" });

    const result = await loginAdapter({ language: locale, returnTo: destination });

    if (result.ok) {
      await refreshIdentity();

      if (navigate) {
        navigate(result.returnTo);
      } else {
        router.replace(result.returnTo);
      }
      refresh?.();
      return;
    }

    if (result.reason === "cancelled") {
      setNoticeMessage(t.passkeyCancelled);
    } else if (result.reason === "unsupported") {
      setErrorMessage(t.passkeyUnsupported);
    } else {
      setErrorMessage(result.message ?? t.passkeyFailed);
    }
    setPendingAction(null);
  };

  const handleSocialLogin = async (provider: IdentityProvider["id"]) => {
    if (pendingAction) {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setPendingAction({ type: "social", provider });

    const result = await socialRedirectAdapter(provider, destination);

    if (result.ok) {
      if (navigate) {
        navigate(result.redirectUrl);
      } else {
        defaultNavigate(result.redirectUrl);
      }
      return;
    }

    setErrorMessage(result.message);
    setPendingAction(null);
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">
            {dictionary.common.accountBrand}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
        </div>

        <section className="space-y-5 rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-[0_12px_36px_rgba(29,47,73,0.08)]">
          <div className="grid gap-3" aria-label={t.ssoTitle}>
            {identityProviders.map((provider) => {
              const isPending = pendingAction?.type === "social" && pendingAction.provider === provider.id;

              return (
                <button
                  key={provider.id}
                  type="button"
                  className={getSocialButtonClassName(provider)}
                  disabled={pendingAction !== null}
                  onClick={() => void handleSocialLogin(provider.id)}
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center" aria-hidden="true">
                    <Image
                      src={provider.iconSrc}
                      alt=""
                      width={provider.iconSize}
                      height={provider.iconSize}
                      className={`${provider.iconClassName} object-contain`}
                    />
                  </span>
                  {isPending ? t.socialPending : `${provider.label}${t.socialSuffix}`}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-xs text-text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-stroke-subtle" />
            <span>{t.alternative}</span>
            <span className="h-px flex-1 bg-stroke-subtle" />
          </div>

          <div className="space-y-3">
            {isWebAuthnSupported === false ? (
              <p className="text-sm leading-6 text-text-muted">{t.passkeyUnsupported}</p>
            ) : null}
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-center rounded-lg border border-brand-primary bg-surface-base px-5 py-3 text-sm font-semibold text-brand-primary transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={pendingAction !== null || isWebAuthnSupported !== true}
              onClick={() => void handlePasskeyLogin()}
            >
              {pendingAction?.type === "passkey" ? t.passkeyPending : t.passkeyButton}
            </button>
          </div>

          {noticeMessage ? (
            <p className="rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-sm text-text-muted" role="status">
              {noticeMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="space-y-1 text-left text-sm text-text-muted sm:text-center">
            <p>{t.ssoSignupNotice}</p>
            <p>
              {t.signupLead}{" "}
              <Link href="/signup" className="font-semibold text-brand-primary underline-offset-4 hover:underline">
                {t.signupLink}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

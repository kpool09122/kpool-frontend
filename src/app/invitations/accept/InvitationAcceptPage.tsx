"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  identityProviders,
  requestSocialRedirect,
  type IdentityProvider,
  type SocialRedirectAdapter,
} from "@/gateways/auth/authFlow";
import { useAuthStore } from "@/gateways/auth/authStore";
import { signupWithApi, type SignupAdapter } from "@/gateways/auth/signupFlow";
import {
  webAuthnBrowserAdapter,
  type WebAuthnBrowserAdapter,
} from "@/gateways/auth/webAuthnBrowserAdapter";
import { useI18n } from "../../../i18n/I18nProvider";

export type InvitationAcceptPageProps = {
  token?: string | null;
  email?: string | null;
  signupAdapter?: Pick<SignupAdapter, "createRegistrationOptions" | "registerWithPasskey">;
  socialRedirectAdapter?: SocialRedirectAdapter;
  webAuthnAdapter?: WebAuthnBrowserAdapter;
  navigate?: (url: string) => void;
  refresh?: () => void;
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

export function InvitationAcceptPage({
  token,
  email,
  signupAdapter = signupWithApi,
  socialRedirectAdapter = requestSocialRedirect,
  webAuthnAdapter = webAuthnBrowserAdapter,
  navigate,
  refresh,
}: InvitationAcceptPageProps) {
  const router = useRouter();
  const { locale, dictionary } = useI18n();
  const t = dictionary.invitationAccept;
  const normalizedToken = token?.trim() ?? "";
  const normalizedEmail = email?.trim() ?? "";
  const invitationReady = normalizedToken.length > 0 && normalizedEmail.length > 0;
  const [identityName, setIdentityName] = useState("");
  const [passkeyDisplayName, setPasskeyDisplayName] = useState("My passkey");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);

  const finish = async () => {
    await refreshIdentity();

    if (navigate) {
      navigate("/admin");
    } else {
      router.replace("/admin");
      router.refresh();
    }
    refresh?.();
  };

  const handlePasskeyAccept = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!invitationReady) {
      setErrorMessage(t.missingParamsMessage);
      return;
    }

    if (pendingAction) {
      return;
    }

    if (!webAuthnAdapter.isSupported()) {
      setErrorMessage(t.passkeyUnsupported);
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setPendingAction({ type: "passkey" });

    void signupAdapter.createRegistrationOptions({
      email: normalizedEmail,
      accountType: null,
      oneTimeToken: normalizedToken,
      return_to: "/admin",
    }, { language: locale }).then(async (options) => {
      const credentialResult = await webAuthnAdapter.create(options);

      if (!credentialResult.ok) {
        if (credentialResult.reason === "cancelled") {
          setNoticeMessage(t.passkeyCancelled);
        } else if (credentialResult.reason === "unsupported") {
          setErrorMessage(t.passkeyUnsupported);
        } else {
          setErrorMessage(t.passkeyFailed);
        }
        return;
      }

      await signupAdapter.registerWithPasskey({
        challengeKey: options.challengeKey,
        identityName,
        displayName: passkeyDisplayName,
        base64EncodedImage: null,
        credential: credentialResult.credential,
      }, { language: locale });
      await finish();
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : t.fallbackError);
    }).finally(() => {
      setPendingAction(null);
    });
  };

  const handleSocialAccept = async (provider: IdentityProvider["id"]) => {
    if (!invitationReady) {
      setErrorMessage(t.missingParamsMessage);
      return;
    }

    if (pendingAction) {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setPendingAction({ type: "social", provider });
    const result = await socialRedirectAdapter(provider, "/admin", normalizedToken);

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
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">{dictionary.common.accountBrand}</p>
            <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-text-muted">{t.description}</p>
          </div>
          {!invitationReady ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
              <p>{t.missingParamsMessage}</p>
              <Link href="/login" className="mt-2 inline-flex underline-offset-4 hover:underline">{t.loginLink}</Link>
            </div>
          ) : null}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t.ssoTitle}</h2>
            <p className="text-sm text-text-muted">{t.ssoDescription}</p>
          </div>
          <div className="grid gap-3" aria-label={t.socialSectionLabel}>
            {identityProviders.map((provider) => (
              <button key={provider.id} type="button" className={getSocialButtonClassName(provider)} disabled={pendingAction !== null || !invitationReady} onClick={() => void handleSocialAccept(provider.id)}>
                <span className="inline-flex h-12 w-12 items-center justify-center" aria-hidden="true">
                  <Image src={provider.iconSrc} alt="" width={provider.iconSize} height={provider.iconSize} className={`${provider.iconClassName} object-contain`} />
                </span>
                {pendingAction?.type === "social" && pendingAction.provider === provider.id ? t.socialPending : `${provider.label}${t.socialSuffix}`}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-[0_12px_36px_rgba(29,47,73,0.08)]">
          <form className="space-y-5" onSubmit={handlePasskeyAccept}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{t.passkeyTitle}</h2>
              <p className="text-sm leading-6 text-text-muted">{t.passkeyDescription}</p>
            </div>
            <label className="block space-y-2 text-sm font-semibold">
              <span>{t.email}</span>
              <input type="email" autoComplete="email" readOnly required value={normalizedEmail} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base read-only:bg-stroke-subtle/40" />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              <span>{t.identityName}</span>
              <input type="text" autoComplete="name" required value={identityName} onChange={(event) => setIdentityName(event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight" />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              <span>{t.passkeyDisplayName}</span>
              <input type="text" required maxLength={64} value={passkeyDisplayName} onChange={(event) => setPasskeyDisplayName(event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight" />
            </label>
            {noticeMessage ? <p className="rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-sm text-text-muted" role="status">{noticeMessage}</p> : null}
            {errorMessage ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{errorMessage}</p> : null}
            <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-lg border border-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-highlight/30 disabled:opacity-70" disabled={pendingAction !== null || !invitationReady}>
              {pendingAction?.type === "passkey" ? t.submitting : t.complete}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

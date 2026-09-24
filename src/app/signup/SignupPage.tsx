"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  identityProviders,
  requestSocialRedirect,
  type IdentityProvider,
  type SocialRedirectAdapter,
} from "@/gateways/auth/authFlow";
import { useAuthStore } from "@/gateways/auth/authStore";
import {
  buildRegistrationOptionsRequest,
  buildRegisterWithPasskeyRequest,
  getSignupStepItems,
  signupWithApi,
  type SignupAccountFormValues,
  type SignupAdapter,
  type SignupPhase,
  type SignupStepId,
  type SignupStepState,
} from "@/gateways/auth/signupFlow";
import {
  webAuthnBrowserAdapter,
  type WebAuthnBrowserAdapter,
} from "@/gateways/auth/webAuthnBrowserAdapter";
import { useI18n } from "../../i18n/I18nProvider";
import { localeLabels, type Locale } from "../../i18n/locales";

type SignupPageProps = {
  signupAdapter?: SignupAdapter;
  socialRedirectAdapter?: SocialRedirectAdapter;
  webAuthnAdapter?: WebAuthnBrowserAdapter;
  navigate?: (url: string) => void;
  refresh?: () => void;
};

const getInitialValues = (language: string): SignupAccountFormValues => ({
  email: "",
  accountName: "",
  accountType: "individual",
  language,
  passkeyDisplayName: "My passkey",
  base64EncodedImage: "",
});

const stepStateClassName: Record<SignupStepState, string> = {
  pending: "bg-stroke-subtle",
  active: "bg-brand-primary",
  processing: "bg-brand-primary",
  complete: "bg-emerald-500",
  error: "bg-red-500",
};

const getSocialButtonClassName = (provider: IdentityProvider): string =>
  [
    "flex min-h-12 items-center justify-center gap-3 rounded-lg px-5 py-0 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
    provider.buttonClassName,
  ].join(" ");

const defaultNavigate = (url: string): void => {
  window.location.assign(url);
};

export function SignupPage({
  signupAdapter = signupWithApi,
  socialRedirectAdapter = requestSocialRedirect,
  webAuthnAdapter = webAuthnBrowserAdapter,
  navigate,
  refresh,
}: SignupPageProps) {
  const router = useRouter();
  const { locale, dictionary, setLocale } = useI18n();
  const t = dictionary.signup;
  const [values, setValues] = useState<SignupAccountFormValues>(() => getInitialValues(locale));
  const [authCode, setAuthCode] = useState("");
  const [phase, setPhase] = useState<SignupPhase>("account");
  const [pending, setPending] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<IdentityProvider["id"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<SignupStepId | null>(null);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);

  const setField = (field: keyof SignupAccountFormValues, value: string): void => {
    if (field === "language") {
      setLocale(value as Locale);
    }

    setValues((current) => ({ ...current, [field]: value }));
  };

  const showError = (error: unknown, step: SignupStepId) => {
    setErrorMessage(error instanceof Error ? error.message : t.fallbackError);
    setErrorStep(step);
  };

  const handleSocialSignup = async (provider: IdentityProvider["id"]) => {
    if (pending || pendingProvider) {
      return;
    }

    setErrorMessage(null);
    setPendingProvider(provider);
    const result = await socialRedirectAdapter(provider, "/admin", undefined, values.accountType);

    if (result.ok) {
      if (navigate) {
        navigate(result.redirectUrl);
      } else {
        defaultNavigate(result.redirectUrl);
      }
      return;
    }

    setErrorMessage(result.message);
    setPendingProvider(null);
  };

  const handleAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setErrorStep(null);

    void signupAdapter.sendAuthCode(
      { email: values.email },
      { language: values.language },
    ).then(() => {
      setPhase("verification");
    }).catch((error: unknown) => {
      showError(error, "account");
    }).finally(() => {
      setPending(false);
    });
  };

  const handleVerificationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setErrorStep(null);

    void signupAdapter.verifyEmail(
      { email: values.email, authCode },
      { language: values.language },
    ).then(() => {
      setPhase("passkey");
    }).catch((error: unknown) => {
      showError(error, "verification");
    }).finally(() => {
      setPending(false);
    });
  };

  const finishRegistration = async () => {
    await refreshIdentity();
    setPhase("complete");

    if (navigate) {
      navigate("/admin");
    } else {
      router.replace("/admin");
      router.refresh();
    }
    refresh?.();
  };

  const handlePasskeySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) {
      return;
    }

    if (!webAuthnAdapter.isSupported()) {
      setErrorMessage(t.passkeyUnsupported);
      setErrorStep("passkey");
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setNoticeMessage(null);
    setErrorStep(null);

    void signupAdapter.createRegistrationOptions(
      buildRegistrationOptionsRequest(values),
      { language: values.language },
    ).then(async (options) => {
      const credentialResult = await webAuthnAdapter.create(options);

      if (!credentialResult.ok) {
        if (credentialResult.reason === "cancelled") {
          setNoticeMessage(t.passkeyCancelled);
        } else if (credentialResult.reason === "unsupported") {
          setErrorMessage(t.passkeyUnsupported);
        } else {
          setErrorMessage(t.passkeyFailed);
        }
        setErrorStep(credentialResult.reason === "cancelled" ? null : "passkey");
        return false;
      }

      await signupAdapter.registerWithPasskey(
        buildRegisterWithPasskeyRequest({
          values,
          challengeKey: options.challengeKey,
          credential: credentialResult.credential,
        }),
        { language: values.language },
      );
      await finishRegistration();
      return true;
    }).catch((error: unknown) => {
      showError(error, "passkey");
    }).finally(() => {
      setPending(false);
    });
  };

  const steps = getSignupStepItems({ phase, pending, errorStep });
  const accountTypeOptions = [
    { value: "individual", label: t.individual },
    { value: "corporation", label: t.corporation },
  ];

  return (
    <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-7">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">
            {dictionary.common.accountBrand}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-text-muted">{t.description}</p>
        </div>

        {phase === "account" ? (
          <section className="space-y-5 rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-[0_12px_36px_rgba(29,47,73,0.08)]">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">{t.accountType}</legend>
              <div className="grid grid-cols-2 gap-2">
                {accountTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={values.accountType === option.value}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold ${values.accountType === option.value ? "border-brand-primary text-brand-primary" : "border-stroke-subtle text-text-muted"}`}
                    onClick={() => setField("accountType", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{t.ssoTitle}</h2>
              <p className="text-sm text-text-muted">{t.ssoDescription}</p>
            </div>
            <div className="grid gap-3" aria-label={t.ssoTitle}>
              {identityProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className={getSocialButtonClassName(provider)}
                  disabled={pending || pendingProvider !== null}
                  onClick={() => void handleSocialSignup(provider.id)}
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center" aria-hidden="true">
                    <Image src={provider.iconSrc} alt="" width={provider.iconSize} height={provider.iconSize} className={`${provider.iconClassName} object-contain`} />
                  </span>
                  {pendingProvider === provider.id ? t.socialPending : `${provider.label}${t.socialSuffix}`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-text-muted" aria-hidden="true">
              <span className="h-px flex-1 bg-stroke-subtle" />
              <span>{t.passkeyAlternative}</span>
              <span className="h-px flex-1 bg-stroke-subtle" />
            </div>

            <form className="space-y-4" onSubmit={handleAccountSubmit}>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{t.passkeySignupTitle}</h2>
                <p className="text-sm text-text-muted">{t.passkeySignupDescription}</p>
              </div>
              <label className="block space-y-2 text-sm font-semibold">
                <span>{t.email}</span>
                <input type="email" autoComplete="email" required value={values.email} onChange={(event) => setField("email", event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight" />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                <span>{t.accountName}</span>
                <input type="text" autoComplete="organization" required value={values.accountName} onChange={(event) => setField("accountName", event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight" />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                <span>{t.language}</span>
                <select required value={values.language} onChange={(event) => setField("language", event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight">
                  {Object.entries(localeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-lg border border-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-highlight/30 disabled:opacity-70" disabled={pending || pendingProvider !== null}>
                {pending ? t.sendingCode : t.sendCode}
              </button>
            </form>
          </section>
        ) : null}

        {phase === "verification" ? (
          <section className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
            <form className="space-y-5" onSubmit={handleVerificationSubmit}>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{t.verificationTitle}</h2>
                <p className="text-sm text-text-muted">{t.verificationDescription(values.email)}</p>
              </div>
              <label className="block space-y-2 text-sm font-semibold">
                <span>{t.authCode}</span>
                <input type="text" inputMode="numeric" autoComplete="one-time-code" required value={authCode} onChange={(event) => setAuthCode(event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight" />
              </label>
              <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-lg border border-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-highlight/30 disabled:opacity-70" disabled={pending}>
                {pending ? t.verifyingCode : t.verifyCode}
              </button>
            </form>
          </section>
        ) : null}

        {phase === "passkey" ? (
          <section className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
            <form className="space-y-5" onSubmit={handlePasskeySubmit}>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{t.passkeyTitle}</h2>
                <p className="text-sm text-text-muted">{t.passkeyDescription}</p>
              </div>
              <label className="block space-y-2 text-sm font-semibold">
                <span>{t.passkeyDisplayName}</span>
                <input type="text" required maxLength={64} value={values.passkeyDisplayName} onChange={(event) => setField("passkeyDisplayName", event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight" />
              </label>
              <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-lg border border-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-highlight/30 disabled:opacity-70" disabled={pending}>
                {pending ? t.completing : t.complete}
              </button>
            </form>
          </section>
        ) : null}

        {noticeMessage ? <p className="rounded-lg border border-stroke-subtle bg-surface-raised px-4 py-3 text-sm text-text-muted" role="status">{noticeMessage}</p> : null}
        {errorMessage ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{errorMessage}</p> : null}

        <ol className="grid grid-cols-3 gap-2" aria-label={t.steps}>
          {steps.map((step) => <li key={step.id} className={`h-1.5 rounded-full ${stepStateClassName[step.state]}`} aria-label={`${step.label}: ${t.stepState[step.state]}`} />)}
        </ol>
      </div>
    </main>
  );
}

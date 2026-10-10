"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useEmailSendingStatus, useHydrated } from "@/components/auth/useEmailSendingStatus";
import {
  clearSessionStorageValue,
  readSignupProgress,
  writeSignupProgress,
} from "@/gateways/auth/emailSendingStateStorage";

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
  webAuthnAdapter?: WebAuthnBrowserAdapter;
  navigate?: (url: string) => void;
  refresh?: () => void;
};

const getInitialValues = (language: string): SignupAccountFormValues => ({
  email: "",
  accountName: "",
  language,
  passkeyDisplayName: "My passkey",
  base64EncodedImage: "",
});

const signupProgressStorageKey = "kpool.signup.progress";
const signupSendingStatusStorageKey = "kpool.signup.email-sending-status";

const stepStateClassName: Record<SignupStepState, string> = {
  pending: "bg-stroke-subtle",
  active: "bg-brand-primary",
  processing: "bg-brand-primary",
  complete: "bg-emerald-500",
  error: "bg-red-500",
};

export function SignupPage(props: SignupPageProps) {
  const hydrated = useHydrated();
  return hydrated ? <SignupPageContent {...props} /> : null;
}

function SignupPageContent({
  signupAdapter = signupWithApi,
  webAuthnAdapter = webAuthnBrowserAdapter,
  navigate,
  refresh,
}: SignupPageProps) {
  const router = useRouter();
  const { locale, dictionary, setLocale } = useI18n();
  const t = dictionary.signup;
  const [values, setValues] = useState<SignupAccountFormValues>(
    () => readSignupProgress(signupProgressStorageKey) ?? getInitialValues(locale),
  );
  const [authCode, setAuthCode] = useState("");
  const [phase, setPhase] = useState<SignupPhase>(
    () => readSignupProgress(signupProgressStorageKey) ? "verification" : "account",
  );
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<SignupStepId | null>(null);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const sendingStatus = useEmailSendingStatus(signupSendingStatusStorageKey, values.email || null);


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

  const sendAuthCode = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setErrorStep(null);

    void signupAdapter.sendAuthCode(
      { email: values.email },
      { language: values.language },
    ).then((result) => {
      sendingStatus.update(result);
      writeSignupProgress(signupProgressStorageKey, values);
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
      sendingStatus.clear();
      clearSessionStorageValue(signupProgressStorageKey);
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

  return (
    <main className="flex-1 bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-7">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">
            {dictionary.common.accountBrand}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
        </div>

        {phase === "account" ? (
          <section className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-[0_12px_36px_rgba(29,47,73,0.08)]">
            <form className="space-y-5" onSubmit={sendAuthCode}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-semibold sm:col-span-2">
                  <span>{t.email}</span>
                  <input type="email" autoComplete="email" required value={values.email} onChange={(event) => setField("email", event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base text-text-strong outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight" />
                </label>
                <label className="block space-y-2 text-sm font-semibold">
                  <span>{t.accountName}</span>
                  <input type="text" autoComplete="organization" required value={values.accountName} onChange={(event) => setField("accountName", event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base text-text-strong outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight" />
                </label>
                <label className="block space-y-2 text-sm font-semibold sm:col-span-2">
                  <span>{t.language}</span>
                  <select required value={values.language} onChange={(event) => setField("language", event.target.value)} className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base text-text-strong outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight">
                    {Object.entries(localeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-lg border border-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-highlight/30 disabled:opacity-70" disabled={pending}>
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
            <div className="mt-4 space-y-2 text-sm text-text-muted" aria-live="polite">
              {sendingStatus.status ? <p>{t.sendAccepted}</p> : null}
              {sendingStatus.remainingSends !== null ? <p>{t.remainingSends(sendingStatus.remainingSends)}</p> : null}
              {sendingStatus.secondsUntilRetry !== null && sendingStatus.secondsUntilRetry > 0
                ? <p>{t.resendWait(sendingStatus.secondsUntilRetry)}</p>
                : null}
              <button
                type="button"
                disabled={pending || sendingStatus.retryUnavailable || (sendingStatus.secondsUntilRetry ?? 0) > 0}
                className="font-semibold text-brand-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void sendAuthCode()}
              >
                {pending ? t.sendingCode : t.resendCode}
              </button>
            </div>
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
        {errorMessage ? <p className="rounded-lg border border-status-danger bg-status-danger/10 px-4 py-3 text-sm font-semibold text-status-danger" role="alert">{errorMessage}</p> : null}

        <ol className="grid grid-cols-3 gap-2" aria-label={t.steps}>
          {steps.map((step) => <li key={step.id} className={`h-1.5 rounded-full ${stepStateClassName[step.state]}`} aria-label={`${step.label}: ${t.stepState[step.state]}`} />)}
        </ol>
      </div>
    </main>
  );
}

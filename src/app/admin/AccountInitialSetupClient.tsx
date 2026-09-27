"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  completeInitialSetup,
  completeInitialSetupAndRefresh,
} from "@/gateways/account/accountBrowserApi";
import { normalizeReturnTo } from "@/gateways/auth/authFlow";
import { useAuthStore, type AuthIdentityRefresh } from "@/gateways/auth/authStore";
import {
  getAuthenticatedAccountStatus,
  type AuthenticatedIdentitySummary,
} from "@/gateways/identity/identityApi";
import { useI18n } from "../../i18n/I18nProvider";

type AccountType = "corporation" | "individual";

type AccountInitialSetupClientProps = {
  completeSetup?: typeof completeInitialSetup;
  navigate?: (url: string) => void;
  refreshIdentity?: AuthIdentityRefresh;
  returnTo?: string | null;
};

const isCompletedIdentity = (
  identity: AuthenticatedIdentitySummary | null,
): identity is AuthenticatedIdentitySummary =>
  identity !== null &&
  getAuthenticatedAccountStatus(identity) === "active" &&
  (identity.account?.type === "corporation" || identity.account?.type === "individual");

export function AccountInitialSetupClient({
  completeSetup = completeInitialSetup,
  navigate,
  refreshIdentity: refreshIdentityProp,
  returnTo = null,
}: AccountInitialSetupClientProps) {
  const router = useRouter();
  const { dictionary } = useI18n();
  const t = dictionary.admin;
  const storeRefreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const refreshIdentity = refreshIdentityProp ?? storeRefreshIdentity;
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const finish = (destination: string) => {
    if (navigate) {
      navigate(destination);
      return;
    }

    router.replace(destination);
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await completeInitialSetupAndRefresh({
      completeSetup,
      fallbackErrorMessage: t.initialSetupFailed,
      refreshIdentity,
      requestBody: { accountType },
    });

    if (!result.ok) {
      setErrorMessage(result.message);
      setIsSubmitting(false);
      return;
    }

    if (!isCompletedIdentity(result.identity)) {
      setErrorMessage(result.setupConflict ? t.initialSetupFailed : t.initialSetupRefreshFailed);
      setIsSubmitting(false);
      return;
    }

    finish(normalizeReturnTo(returnTo));
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft sm:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t.initialSetupTitle}</h1>
        <p className="text-sm leading-7 text-text-muted">{t.initialSetupDescription}</p>
      </div>

      <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
        <fieldset className="space-y-3" disabled={isSubmitting}>
          <legend className="text-sm font-semibold">{t.initialSetupAccountTypeLabel}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["individual", t.initialSetupIndividual],
              ["corporation", t.initialSetupCorporation],
            ] as const).map(([value, label]) => (
              <label
                key={value}
                className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                  accountType === value
                    ? "border-brand-primary bg-brand-highlight/30"
                    : "border-stroke-subtle bg-surface-base hover:border-brand-primary"
                }`}
              >
                <input
                  type="radio"
                  name="accountType"
                  value={value}
                  checked={accountType === value}
                  onChange={() => {
                    setAccountType(value);
                    setErrorMessage(null);
                  }}
                />
                <span className="font-semibold">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {t.initialSetupImmutableNotice}
        </p>

        {errorMessage ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-12 w-full items-center justify-center rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? t.initialSetupSubmitting
            : errorMessage
              ? t.initialSetupRetry
              : t.initialSetupSubmit}
        </button>
      </form>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import {
  webAuthnBrowserAdapter,
  type WebAuthnBrowserAdapter,
} from "@/gateways/auth/webAuthnBrowserAdapter";
import type { PasskeySummary } from "@/gateways/identity/identityApi";
import {
  passkeyBrowserApi,
  type PasskeyBrowserApi,
} from "@/gateways/identity/passkeyBrowserApi";
import { useI18n } from "../../../../i18n/I18nProvider";

type SocialProvider = "google" | "line" | "kakao";

type PasskeyManagementPanelProps = {
  api?: PasskeyBrowserApi;
  linkedSocialProviders?: string[];
  navigate?: (url: string) => void;
  onStepUpConsumed?: () => void;
  ssoStepUpCompleted?: boolean;
  webAuthnAdapter?: WebAuthnBrowserAdapter;
};

const isSocialProvider = (value: string): value is SocialProvider =>
  value === "google" || value === "line" || value === "kakao";

const defaultNavigate = (url: string): void => {
  window.location.assign(url);
};

export function PasskeyManagementPanel({
  api = passkeyBrowserApi,
  linkedSocialProviders = [],
  navigate = defaultNavigate,
  onStepUpConsumed = () => undefined,
  ssoStepUpCompleted = false,
  webAuthnAdapter = webAuthnBrowserAdapter,
}: PasskeyManagementPanelProps) {
  const { locale, dictionary } = useI18n();
  const t = dictionary.admin;
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const passkeyQuery = useQuery({
    queryKey: ["identity-passkeys"],
    queryFn: async () => {
      const result = await api.list();

      return result.ok
        ? result.data.passkeys
        : Promise.reject(new Error(result.message));
    },
  });
  const passkeys = passkeyQuery.data ?? [];

  const clearMessages = () => {
    setError(null);
    setNotice(null);
  };

  const requireAdditionalVerification = async () => {
    if (passkeys.length === 0) {
      if (ssoStepUpCompleted) {
        return true;
      }

      const provider = linkedSocialProviders.find(isSocialProvider);

      if (!provider) {
        setError(t.passkeyRecoveryRequired);
        return false;
      }

      const redirectResult = await api.createStepUpSocialRedirect(provider);

      if (!redirectResult.ok) {
        setError(redirectResult.message);
        return false;
      }

      setNotice(t.passkeySsoRedirecting);
      navigate(redirectResult.data.redirectUrl);
      return false;
    }

    if (!webAuthnAdapter.isSupported()) {
      setError(t.passkeyUnsupported);
      return false;
    }

    const optionsResult = await api.createStepUpPasskeyOptions();

    if (!optionsResult.ok) {
      setError(optionsResult.message);
      return false;
    }

    const credentialResult = await webAuthnAdapter.get(optionsResult.data);

    if (!credentialResult.ok) {
      setError(
        credentialResult.reason === "cancelled"
          ? t.passkeyVerificationCancelled
          : credentialResult.reason === "unsupported"
            ? t.passkeyUnsupported
            : t.passkeyVerificationFailed,
      );
      return false;
    }

    const verificationResult = await api.completeStepUpWithPasskey({
      challengeKey: optionsResult.data.challengeKey,
      credential: credentialResult.credential,
    });

    if (!verificationResult.ok) {
      setError(
        verificationResult.status === 401 || verificationResult.status === 419
          ? t.passkeyVerificationExpired
          : verificationResult.message,
      );
      return false;
    }

    return true;
  };

  const handleAdd = async () => {
    if (busyAction) {
      return;
    }

    setBusyAction("add");
    clearMessages();

    if (!(await requireAdditionalVerification())) {
      setBusyAction(null);
      return;
    }

    const optionsResult = await api.createAdditionOptions();

    if (!optionsResult.ok) {
      if (ssoStepUpCompleted && (optionsResult.status === 401 || optionsResult.status === 403)) {
        onStepUpConsumed();
        setError(t.passkeyVerificationExpired);
      } else {
        setError(optionsResult.message);
      }
      setBusyAction(null);
      return;
    }

    const credentialResult = await webAuthnAdapter.create(optionsResult.data);

    if (!credentialResult.ok) {
      setError(
        credentialResult.reason === "cancelled"
          ? t.passkeyCancelled
          : credentialResult.reason === "unsupported"
            ? t.passkeyUnsupported
            : t.passkeyOperationFailed,
      );
      setBusyAction(null);
      return;
    }

    const addResult = await api.add({
      challengeKey: optionsResult.data.challengeKey,
      displayName: t.passkeyDefaultDisplayName,
      credential: credentialResult.credential,
    });

    if (addResult.ok) {
      onStepUpConsumed();
      setNotice(t.passkeyAdded);
      await passkeyQuery.refetch();
    } else {
      setError(addResult.message);
    }
    setBusyAction(null);
  };

  const handleRename = async (passkeyIdentifier: string, nextDisplayName: string) => {
    if (busyAction) {
      return;
    }

    const nextName = nextDisplayName.trim();

    if (!nextName) {
      setError(t.passkeyNameRequired);
      return;
    }

    setBusyAction(`rename:${passkeyIdentifier}`);
    clearMessages();
    const result = await api.update(passkeyIdentifier, { displayName: nextName });

    if (result.ok) {
      setNotice(t.passkeyRenamed);
      await passkeyQuery.refetch();
    } else {
      setError(result.message);
    }
    setBusyAction(null);
  };

  const handleDelete = async (passkey: PasskeySummary) => {
    if (busyAction || !window.confirm(t.passkeyDeleteConfirm(passkey.displayName))) {
      return;
    }

    setBusyAction(`delete:${passkey.passkeyIdentifier}`);
    clearMessages();

    if (!(await requireAdditionalVerification())) {
      setBusyAction(null);
      return;
    }

    const result = await api.delete(passkey.passkeyIdentifier);

    if (result.ok) {
      setNotice(t.passkeyDeleted);
      await passkeyQuery.refetch();
    } else {
      setError(result.status === 409 ? t.passkeyLastMethodError : result.message);
    }
    setBusyAction(null);
  };

  const formatDate = (value: string | null): string =>
    value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : t.passkeyNeverUsed;

  return (
    <UserSettingsPanel title={t.passkeySettingsTitle} description={t.passkeySettingsDescription}>
      <div className="mt-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stroke-subtle bg-surface-base p-4">
          <div>
            <p className="font-semibold">{t.passkeyAdd}</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">{t.passkeyAddGuidance}</p>
          </div>
          <button className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={busyAction !== null || passkeyQuery.isLoading} onClick={() => void handleAdd()}>
            {busyAction === "add" ? t.passkeyAdding : t.passkeyAdd}
          </button>
        </div>
        <p className="text-sm leading-6 text-text-muted">{t.passkeyAdditionalVerification}</p>
        <p className="text-sm leading-6 text-text-muted">
          {t.passkeyRecoveryGuidance} <Link className="font-semibold text-brand-primary underline" href="/login">{t.passkeyRecoveryLink}</Link>
        </p>

        {passkeyQuery.isLoading ? <p className="text-sm text-text-muted">{t.passkeyLoading}</p> : null}
        {!passkeyQuery.isLoading && !passkeyQuery.error && passkeys.length === 0 ? <p className="text-sm text-text-muted">{t.passkeyEmpty}</p> : null}
        <ul className="space-y-3" aria-label={t.passkeyListLabel}>
          {passkeys.map((passkey) => (
            <li key={passkey.passkeyIdentifier} className="space-y-3 rounded-lg border border-stroke-subtle bg-surface-base p-4">
              <form
                className="grid gap-2 sm:grid-cols-[1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextName = new FormData(event.currentTarget).get("displayName");
                  void handleRename(passkey.passkeyIdentifier, typeof nextName === "string" ? nextName : "");
                }}
              >
                <label className="grid gap-2 text-sm font-semibold">
                  {t.passkeyDisplayNameLabel}
                  <input className="rounded-lg border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={passkey.displayName} maxLength={64} name="displayName" />
                </label>
                <button type="submit" className="self-end rounded-lg border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary disabled:opacity-60" disabled={busyAction !== null}>{t.passkeyRename}</button>
              </form>
              <dl className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                <div><dt className="font-semibold">{t.passkeyCreatedAt}</dt><dd>{formatDate(passkey.createdAt)}</dd></div>
                <div><dt className="font-semibold">{t.passkeyLastUsedAt}</dt><dd>{formatDate(passkey.lastUsedAt)}</dd></div>
              </dl>
              <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60" disabled={busyAction !== null} onClick={() => void handleDelete(passkey)}>{t.passkeyDelete}</button>
            </li>
          ))}
        </ul>
        {error || passkeyQuery.error ? <UserStatusMessage variant="error">{error ?? passkeyQuery.error?.message}</UserStatusMessage> : null}
        {notice ? <UserStatusMessage variant="success">{notice}</UserStatusMessage> : null}
      </div>
    </UserSettingsPanel>
  );
}

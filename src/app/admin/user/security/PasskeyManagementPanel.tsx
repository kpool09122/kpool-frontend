"use client";

import { useQuery } from "@tanstack/react-query";
import { Pencil1Icon } from "@radix-ui/react-icons";
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
  passkeyCount?: number;
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
  passkeyCount = 0,
  ssoStepUpCompleted = false,
  webAuthnAdapter = webAuthnBrowserAdapter,
}: PasskeyManagementPanelProps) {
  const { locale, dictionary } = useI18n();
  const t = dictionary.admin;
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [editingPasskeyIdentifier, setEditingPasskeyIdentifier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const passkeyQuery = useQuery({
    queryKey: ["identity-passkeys"],
    queryFn: () => api.list(),
  });
  const listResult = passkeyQuery.data;
  const passkeys = listResult?.ok ? listResult.data.passkeys : [];
  const verificationRequired = listResult?.ok === false
    && (listResult.status === 401 || listResult.status === 403);
  const listError = listResult?.ok === false && !verificationRequired
    ? listResult.message
    : null;

  const clearMessages = () => {
    setError(null);
    setNotice(null);
  };

  const requireAdditionalVerification = async () => {
    if (passkeyCount === 0) {
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

  const handleVerify = async () => {
    if (busyAction) {
      return;
    }

    setBusyAction("verify");
    clearMessages();

    if (await requireAdditionalVerification()) {
      await passkeyQuery.refetch();
    }

    setBusyAction(null);
  };

  const handleAdd = async () => {
    if (busyAction) {
      return;
    }

    setBusyAction("add");
    clearMessages();

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
      setEditingPasskeyIdentifier(null);
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
    <UserSettingsPanel
      title={t.passkeySettingsTitle}
      action={listResult?.ok ? (
        <button className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={busyAction !== null} onClick={() => void handleAdd()}>
          {busyAction === "add" ? t.passkeyAdding : t.passkeyAdd}
        </button>
      ) : null}
    >
      <div className="mt-5 space-y-5">
        {verificationRequired ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stroke-subtle bg-surface-base p-4">
            <div>
              <p className="text-sm leading-6 text-text-muted">{t.passkeyVerificationRequired}</p>
            </div>
            <button className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={busyAction !== null} onClick={() => void handleVerify()}>
              {busyAction === "verify" ? t.passkeyVerifying : t.passkeyVerify}
            </button>
          </div>
        ) : null}

        {listResult?.ok ? (
          <>
            {passkeys.length === 0 ? <p className="text-sm text-text-muted">{t.passkeyEmpty}</p> : null}
            <ul className="space-y-3" aria-label={t.passkeyListLabel}>
              {passkeys.map((passkey) => (
                <li key={passkey.passkeyIdentifier} className="rounded-lg border border-stroke-subtle bg-surface-base p-4">
                  <div className="grid items-center gap-3 lg:grid-cols-[minmax(12rem,1fr)_auto_auto_auto]">
                    {editingPasskeyIdentifier === passkey.passkeyIdentifier ? (
                      <form
                        className="flex min-w-0 items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const nextName = new FormData(event.currentTarget).get("displayName");
                          void handleRename(passkey.passkeyIdentifier, typeof nextName === "string" ? nextName : "");
                        }}
                      >
                        <input autoFocus aria-label={t.passkeyDisplayNameLabel} className="w-48 min-w-0 rounded-lg border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={passkey.displayName} maxLength={64} name="displayName" />
                        <button type="submit" className="rounded-lg border border-brand-primary px-3 py-2 text-sm font-semibold text-brand-primary disabled:opacity-60" disabled={busyAction !== null}>{t.passkeySave}</button>
                        <button type="button" className="rounded-lg border border-stroke-subtle px-3 py-2 text-sm font-semibold text-text-muted disabled:opacity-60" disabled={busyAction !== null} onClick={() => {
                          clearMessages();
                          setEditingPasskeyIdentifier(null);
                        }}>{t.passkeyCancel}</button>
                      </form>
                    ) : (
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-semibold">{passkey.displayName}</span>
                        <button aria-label={t.passkeyEditName(passkey.displayName)} className="shrink-0 rounded p-1 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-60" type="button" disabled={busyAction !== null} onClick={() => {
                          clearMessages();
                          setEditingPasskeyIdentifier(passkey.passkeyIdentifier);
                        }}>
                          <Pencil1Icon aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <dl className="contents text-sm text-text-muted">
                      <div className="whitespace-nowrap"><dt className="inline font-semibold">{t.passkeyCreatedAt}: </dt><dd className="inline">{formatDate(passkey.createdAt)}</dd></div>
                      <div className="whitespace-nowrap"><dt className="inline font-semibold">{t.passkeyLastUsedAt}: </dt><dd className="inline">{formatDate(passkey.lastUsedAt)}</dd></div>
                    </dl>
                    <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60" disabled={busyAction !== null} onClick={() => void handleDelete(passkey)}>{t.passkeyDelete}</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {passkeyQuery.isLoading ? <p className="text-sm text-text-muted">{t.passkeyLoading}</p> : null}
        {error || listError ? <UserStatusMessage variant="error">{error ?? listError}</UserStatusMessage> : null}
        {notice ? <UserStatusMessage variant="success">{notice}</UserStatusMessage> : null}
      </div>
    </UserSettingsPanel>
  );
}

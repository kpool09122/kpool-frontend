"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

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

type PasskeyManagementPanelProps = {
  api?: PasskeyBrowserApi;
  webAuthnAdapter?: WebAuthnBrowserAdapter;
};

export function PasskeyManagementPanel({
  api = passkeyBrowserApi,
  webAuthnAdapter = webAuthnBrowserAdapter,
}: PasskeyManagementPanelProps) {
  const { locale, dictionary } = useI18n();
  const t = dictionary.admin;
  const [displayName, setDisplayName] = useState("My passkey");
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

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (busyAction) {
      return;
    }

    if (!webAuthnAdapter.isSupported()) {
      setError(t.passkeyUnsupported);
      return;
    }

    setBusyAction("add");
    setError(null);
    setNotice(null);

    void api.createAdditionOptions().then(async (optionsResult) => {
      if (!optionsResult.ok) {
        setError(optionsResult.message);
        return;
      }

      const credentialResult = await webAuthnAdapter.create(optionsResult.data);

      if (!credentialResult.ok) {
        if (credentialResult.reason === "cancelled") {
          setNotice(t.passkeyCancelled);
        } else if (credentialResult.reason === "unsupported") {
          setError(t.passkeyUnsupported);
        } else {
          setError(t.passkeyOperationFailed);
        }
        return;
      }

      const addResult = await api.add({
        challengeKey: optionsResult.data.challengeKey,
        displayName: displayName.trim(),
        credential: credentialResult.credential,
      });

      if (!addResult.ok) {
        setError(addResult.message);
        return;
      }

      setNotice(t.passkeyAdded);
      await passkeyQuery.refetch();
    }).finally(() => {
      setBusyAction(null);
    });
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
    setError(null);
    setNotice(null);
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
    setError(null);
    setNotice(null);
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
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleAdd}>
          <label className="grid gap-2 text-sm font-semibold">
            {t.passkeyDisplayNameLabel}
            <input className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2" required maxLength={64} value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} />
          </label>
          <button className="self-end rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={busyAction !== null || !displayName.trim()}>
            {busyAction === "add" ? t.passkeyAdding : t.passkeyAdd}
          </button>
        </form>
        <p className="text-sm leading-6 text-text-muted">{t.passkeyAddGuidance}</p>

        {passkeyQuery.isLoading ? <p className="text-sm text-text-muted">{t.passkeyLoading}</p> : null}
        {!passkeyQuery.isLoading && passkeys.length === 0 ? <p className="text-sm text-text-muted">{t.passkeyEmpty}</p> : null}
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
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60" disabled={busyAction !== null} onClick={() => void handleDelete(passkey)}>{t.passkeyDelete}</button>
              </div>
            </li>
          ))}
        </ul>
        {error || passkeyQuery.error ? <UserStatusMessage variant="error">{error ?? passkeyQuery.error?.message}</UserStatusMessage> : null}
        {notice ? <UserStatusMessage variant="success">{notice}</UserStatusMessage> : null}
      </div>
    </UserSettingsPanel>
  );
}

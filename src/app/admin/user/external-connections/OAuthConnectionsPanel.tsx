"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import {
  oauthConnectionsBrowserApi,
  type OAuthConnectionsBrowserApi,
} from "@/gateways/identity/oauthConnectionsBrowserApi";
import {
  consentScopes,
  type ScopeSettings,
} from "@/gateways/identity/oauthConnectionsContract";
import { useI18n } from "@/i18n/I18nProvider";
import { oauthConsentDictionaries } from "@/i18n/oauthConsent";
import { oauthConnectionsDictionaries } from "@/i18n/oauthConnections";

export function OAuthConnectionsPanel({
  identityIdentifier,
  sessionVersion,
  api = oauthConnectionsBrowserApi,
}: {
  identityIdentifier: string;
  sessionVersion: number;
  api?: OAuthConnectionsBrowserApi;
}) {
  return (
    <ConnectionsWorkspace
      key={`${identityIdentifier}:${sessionVersion}`}
      identityIdentifier={identityIdentifier}
      sessionVersion={sessionVersion}
      api={api}
    />
  );
}
function ConnectionsWorkspace({
  identityIdentifier,
  sessionVersion,
  api,
}: {
  identityIdentifier: string;
  sessionVersion: number;
  api: OAuthConnectionsBrowserApi;
}) {
  const { locale } = useI18n();
  const t = oauthConnectionsDictionaries[locale];
  const descriptions = oauthConsentDictionaries[locale].descriptions;
  const client = useQueryClient();
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [draft, setDraft] = useState<ScopeSettings["scopes"] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "revoke" | null>(null);
  const [notice, setNotice] = useState<"saved" | "done" | "already" | null>(
    null,
  );
  const [error, setError] = useState(false);
  const [expired, setExpired] = useState(false);
  const settingsKey = [
    "identity-oauth-settings",
    identityIdentifier,
    sessionVersion,
    locale,
  ];
  const listKey = [
    "identity-oauth-connections",
    identityIdentifier,
    sessionVersion,
    locale,
  ];
  const settings = useQuery({
    queryKey: settingsKey,
    queryFn: () => api.settings(locale),
    enabled: !expired,
    retry: false,
  });
  const list = useQuery({
    queryKey: listKey,
    queryFn: () => api.list(locale),
    enabled: !expired,
    retry: false,
  });
  const denied =
    expired ||
    [settings.data, list.data].some(
      (result) => result?.ok === false && result.status === 401,
    );
  const selected =
    draft ?? (settings.data?.ok ? settings.data.data.scopes : []);
  const allScopesSelected = consentScopes.every((scope) => selected.includes(scope));
  const someScopesSelected = consentScopes.some((scope) => selected.includes(scope));
  const connections = list.data?.ok ? list.data.data.connections : [];
  const target = connections.find(
    (connection) => connection.connectionIdentifier === confirmId,
  );
  const failed =
    error ||
    settings.isError ||
    list.isError ||
    settings.data?.ok === false ||
    list.data?.ok === false;
  const save = async () => {
    if (inFlight.current || denied || !settings.data?.ok) return;
    inFlight.current = true;
    setBusy("save");
    setError(false);
    setNotice(null);
    const scopes = [...selected];
    const result = await api.save(scopes, locale);
    if (!alive.current) return;
    if (result.ok) {
      client.setQueryData(settingsKey, { ok: true, data: { scopes } });
      setDraft(null);
      setNotice("saved");
    } else {
      setError(true);
      if (result.status === 401) setExpired(true);
    }
    inFlight.current = false;
    setBusy(null);
  };
  const revoke = async () => {
    if (inFlight.current || denied || !target || target.revokedAt !== null)
      return;
    inFlight.current = true;
    setBusy("revoke");
    setError(false);
    setNotice(null);
    const id = target.connectionIdentifier;
    const result = await api.revoke(id, locale);
    if (!alive.current) return;
    if (result.ok || result.status === 404) {
      setNotice(result.ok ? "done" : "already");
      setConfirmId(null);
      // Remove the confirmed target immediately; a failed refetch must not revive its revoke control.
      client.setQueryData(listKey, {
        ok: true,
        data: {
          connections: connections.filter(
            (connection) => connection.connectionIdentifier !== id,
          ),
        },
      });
      await list.refetch();
    } else {
      setError(true);
      if (result.status === 401) setExpired(true);
    }
    if (alive.current) {
      inFlight.current = false;
      setBusy(null);
    }
  };
  const buttonClass =
    "rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold disabled:opacity-60";
  return (
    <section
      aria-label={t.title}
      className="space-y-5"
      id="external-connections"
    >
      {denied ? (
        <div role="alert">
          <p>{t.session}</p>
          <Link href="/login?returnTo=%2Fadmin%2Fuser%2Fexternal-connections">
            {t.login}
          </Link>
        </div>
      ) : (
        <>
          {notice && <UserStatusMessage variant="success">{t[notice]}</UserStatusMessage>}
          {failed && <UserStatusMessage variant="error">{t.failed}</UserStatusMessage>}
          <UserSettingsPanel
            title={t.scopes}
            description={t.introduction}
            action={settings.data?.ok ? (
              <button
                className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy !== null}
                onClick={() => void save()}
                type="button"
              >
                {busy === "save" ? t.saving : t.save}
              </button>
            ) : null}
          >
            <div className="mt-5 space-y-3 text-sm">
              <p className="leading-6 text-text-muted">{t.future}</p>
              {settings.isPending && <p role="status">{t.loading}</p>}
              {settings.data?.ok && (
                <fieldset
                  aria-label={t.scopes}
                  disabled={busy !== null}
                  className="divide-y divide-stroke-subtle overflow-hidden rounded-lg border border-stroke-subtle"
                >
                  <label className="flex cursor-pointer items-center gap-3 bg-surface-base px-4 py-3 font-semibold has-disabled:cursor-not-allowed has-disabled:opacity-60">
                    <input
                      className="size-4 shrink-0 accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                      type="checkbox"
                      checked={allScopesSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someScopesSelected && !allScopesSelected;
                      }}
                      onChange={(event) => {
                        setNotice(null);
                        setDraft(event.target.checked ? [...consentScopes] : []);
                      }}
                    />
                    <span>{t.selectAll}</span>
                  </label>
                  {consentScopes.map((scope) => (
                    <label
                      className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-surface-base has-checked:bg-brand-primary/5 has-disabled:cursor-not-allowed has-disabled:opacity-60"
                      key={scope}
                    >
                      <input
                        className="mt-0.5 size-4 shrink-0 accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                        type="checkbox"
                        checked={selected.includes(scope)}
                        onChange={(event) => {
                          setNotice(null);
                          setDraft(
                            event.target.checked
                              ? [...selected, scope]
                              : selected.filter((item) => item !== scope),
                          );
                        }}
                      />
                      <span className="min-w-0 space-y-1">
                        <span className="block font-semibold text-text-strong">{descriptions[scope]}</span>{" "}
                        <code className="block text-xs leading-5 break-all text-text-muted">{scope}</code>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
            </div>
          </UserSettingsPanel>
          <UserSettingsPanel title={t.list}>
            <div className="mt-5 space-y-4 text-sm">
              {list.isPending && <p role="status">{t.loading}</p>}
              {list.data?.ok && connections.length === 0 && <p>{t.empty}</p>}
              <ul className="space-y-4">
                {connections.map((connection) => (
                  <li
                    key={connection.connectionIdentifier}
                    className="space-y-2 rounded-lg border border-stroke-subtle bg-surface-base p-4 break-words"
                  >
                    <h3 className="font-semibold">{connection.clientName}</h3>
                    <p>
                      {t.clientIdentifier}:{" "}
                      <span className="break-all">
                        {connection.clientIdentifier}
                      </span>
                    </p>
                    <p>
                      {t.identifier}:{" "}
                      <span className="break-all">
                        {connection.connectionIdentifier}
                      </span>
                    </p>
                    <p>
                      {t.created}:{" "}
                      <LocalizedDateTime value={connection.createdAt} />
                    </p>
                    <p>{connection.revokedAt === null ? t.active : t.revoked}</p>
                    <ul>
                      {connection.scopes.map((scope) => (
                        <li key={scope}>
                          <code>{scope}</code> — {descriptions[scope]}
                        </li>
                      ))}
                    </ul>
                    {connection.revokedAt === null &&
                      confirmId !== connection.connectionIdentifier && (
                        <button
                          className={buttonClass}
                          disabled={busy !== null}
                          onClick={() => {
                            setNotice(null);
                            setConfirmId(connection.connectionIdentifier);
                          }}
                          type="button"
                        >
                          {t.revoke}
                        </button>
                      )}
                    {target?.connectionIdentifier ===
                      connection.connectionIdentifier && (
                      <fieldset
                        aria-label={t.confirm}
                        className="space-y-2 rounded border border-stroke-subtle p-3"
                        disabled={busy !== null}
                      >
                        <legend>{t.confirm}</legend>
                        <p>{connection.clientName}</p>
                        <p className="break-all">
                          {connection.connectionIdentifier}
                        </p>
                        <p>{t.impact}</p>
                        <button
                          className={buttonClass}
                          onClick={() => void revoke()}
                          type="button"
                        >
                          {busy === "revoke" ? t.revoking : t.proceed}
                        </button>
                        <button
                          className={buttonClass}
                          onClick={() => setConfirmId(null)}
                          type="button"
                        >
                          {t.cancel}
                        </button>
                      </fieldset>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </UserSettingsPanel>
        </>
      )}
    </section>
  );
}

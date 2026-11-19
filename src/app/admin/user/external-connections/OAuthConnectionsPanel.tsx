"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserSettingsPanel, UserStatusMessage } from "@/components/User";
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

const isChatGPT = (name: string) => name.trim().toLowerCase() === "chatgpt";

function ConnectionAppName({ name }: { name: string }) {
  return <div className="flex min-w-0 items-center gap-3">
    {isChatGPT(name) && (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white p-2">
        <Image src="/ChatGPT-Logo.webp" alt="" width={24} height={24} />
      </span>
    )}
    <h3 className="min-w-0 font-semibold [overflow-wrap:anywhere]">{name}</h3>
  </div>;
}

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
  const [draft, setDraft] = useState<ScopeSettings["scopes"] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState<"saved" | "done" | "already" | null>(
    null,
  );
  const mutationKey = ["identity-oauth-mutations", identityIdentifier, sessionVersion];
  const saveMutation = useMutation({
    mutationKey: [...mutationKey, "save"],
    mutationFn: (scopes: ScopeSettings["scopes"]) => api.save(scopes, locale),
    retry: false,
  });
  const revokeMutation = useMutation({
    mutationKey: [...mutationKey, "revoke"],
    mutationFn: (id: string) => api.revoke(id, locale),
    retry: false,
  });
  const isPending = saveMutation.isPending || revokeMutation.isPending;
  const expired = [saveMutation.data, revokeMutation.data].some(
    (result) => result?.ok === false && result.status === 401,
  );
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
    saveMutation.isError ||
    revokeMutation.isError ||
    saveMutation.data?.ok === false ||
    (revokeMutation.data?.ok === false && revokeMutation.data.status !== 404) ||
    settings.isError ||
    list.isError ||
    settings.data?.ok === false ||
    list.data?.ok === false;
  const save = () => {
    if (client.isMutating({ mutationKey }) || denied || !settings.data?.ok) return;
    revokeMutation.reset();
    setNotice(null);
    // Per-call callbacks are skipped after unmount, including Identity/session changes.
    saveMutation.mutate([...selected], {
      onSuccess: (result, scopes) => {
        if (!result.ok) return;
        client.setQueryData(settingsKey, { ok: true, data: { scopes } });
        setDraft(null);
        setNotice("saved");
      },
    });
  };
  const revoke = () => {
    if (client.isMutating({ mutationKey }) || denied || !target || target.revokedAt !== null)
      return;
    saveMutation.reset();
    setNotice(null);
    revokeMutation.mutate(target.connectionIdentifier, {
      onSuccess: (result, id) => {
        if (!result.ok && result.status !== 404) return;
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
        void list.refetch();
      },
    });
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
                disabled={isPending}
                onClick={save}
                type="button"
              >
                {saveMutation.isPending ? t.saving : t.save}
              </button>
            ) : null}
          >
            <div className="mt-5 space-y-3 text-sm">
              <p className="leading-6 text-text-muted">{t.future}</p>
              {settings.isPending && <p role="status">{t.loading}</p>}
              {settings.data?.ok && (
                <fieldset
                  aria-label={t.scopes}
                  disabled={isPending}
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
                      <span className="min-w-0 font-semibold text-text-strong">{descriptions[scope]}</span>
                    </label>
                  ))}
                </fieldset>
              )}
            </div>
          </UserSettingsPanel>
          <UserSettingsPanel title={t.list}>
            <div className="mt-3 space-y-2 text-sm">
              {list.isPending && <p role="status">{t.loading}</p>}
              <ul className="space-y-2">
                {list.data?.ok && !connections.some((connection) => isChatGPT(connection.clientName)) && (
                  <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2">
                    <ConnectionAppName name="ChatGPT" />
                    <p className="ml-auto shrink-0 text-text-muted">{t.empty}</p>
                  </li>
                )}
                {connections.map((connection) => (
                  <li
                    key={connection.connectionIdentifier}
                    className="space-y-2 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 break-words"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <ConnectionAppName name={connection.clientName} />
                      <div className="ml-auto shrink-0">
                        {connection.revokedAt === null &&
                          confirmId !== connection.connectionIdentifier && (
                            <button
                              className={buttonClass}
                              disabled={isPending}
                              onClick={() => {
                                setNotice(null);
                                setConfirmId(connection.connectionIdentifier);
                              }}
                              type="button"
                            >
                              {t.revoke}
                            </button>
                          )}
                        {connection.revokedAt !== null && <p className="text-text-muted">{t.empty}</p>}
                      </div>
                    </div>
                    {target?.connectionIdentifier ===
                      connection.connectionIdentifier && (
                      <fieldset
                        aria-label={t.confirm}
                        className="space-y-2 rounded border border-stroke-subtle p-3"
                        disabled={isPending}
                      >
                        <legend>{t.confirm}</legend>
                        <p>{connection.clientName}</p>
                        <p>{t.impact}</p>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            className={buttonClass}
                            onClick={revoke}
                            type="button"
                          >
                            {revokeMutation.isPending ? t.revoking : t.proceed}
                          </button>
                          <button
                            className={buttonClass}
                            onClick={() => setConfirmId(null)}
                            type="button"
                          >
                            {t.cancel}
                          </button>
                        </div>
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

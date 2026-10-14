"use client";
import { AccountSettingsPanel } from "@/components/Account/AccountSettingsPanel";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestAccountNotificationSettings } from "@/gateways/account/accountNotificationApi";
import { isAccountBrowserApiError } from "@/gateways/account/accountBrowserApi";
import { useI18n } from "../../../../i18n/I18nProvider";
import { useAccountSection } from "../AccountSectionContext";

export function AccountNotificationsClient() {
  const context = useAccountSection();
  if (!context.accountIdentifier || !context.canReadNotifications) return null;
  return (
    <NotificationEditor
      key={`${context.accountIdentifier}:${context.accountPrincipalIdentifier}`}
    />
  );
}
function NotificationEditor() {
  const {
    accountIdentifier,
    accountPrincipalIdentifier,
    canReadNotifications,
    canUpdateNotifications,
    t,
    onAuthorizationRejected,
  } = useAccountSection();
  const { locale } = useI18n();
  const copy = t.accountNotifications;
  const mounted = useRef(true);
  const rejectedError = useRef<unknown>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const query = useQuery({
    queryKey: [
      "account-notification-settings",
      accountIdentifier,
      accountPrincipalIdentifier,
    ],
    queryFn: () =>
      requestAccountNotificationSettings(accountIdentifier ?? "", locale),
    enabled: Boolean(accountIdentifier && canReadNotifications && !blocked),
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  const rejectAuthorization = (error: unknown) => {
    if (
      isAccountBrowserApiError(error) &&
      [401, 403].includes(error.accountRouteStatus)
    ) {
      rejectedError.current = error;
      setBlocked(true);
      onAuthorizationRejected();
    }
  };
  useEffect(() => {
    if (
      query.error !== rejectedError.current &&
      isAccountBrowserApiError(query.error) &&
      [401, 403].includes(query.error.accountRouteStatus)
    ) {
      rejectedError.current = query.error;
      onAuthorizationRejected();
    }
  }, [query.error, onAuthorizationRejected]);
  const data = query.data;
  const selected =
    draft ??
    data?.recipients.map((recipient) => recipient.identityIdentifier) ??
    [];
  const denied =
    blocked ||
    Boolean(
      isAccountBrowserApiError(query.error) &&
        [401, 403].includes(query.error.accountRouteStatus),
    );
  const editable = Boolean(
    canUpdateNotifications &&
      data &&
      !saving &&
      !query.isFetching &&
      !query.isError &&
      !refreshRequired &&
      !denied,
  );
  const reload = async () => {
    const result = await query.refetch();
    if (!mounted.current) return;
    if (result.error) {
      rejectAuthorization(result.error);
      setMessage(copy.loadFailed);
      return;
    }
    setDraft(null);
    setRefreshRequired(false);
    setMessage(null);
  };
  const save = async () => {
    if (
      !editable ||
      !accountIdentifier ||
      selected.length > (data?.maxRecipients ?? 0)
    )
      return;
    setSaving(true);
    setMessage(null);
    const result = await requestAccountNotificationSettings(
      accountIdentifier,
      locale,
      {
        recipients: selected.map((identityIdentifier) => ({
          identityIdentifier,
          channel: "email",
        })),
      },
    )
      .then(() => ({ ok: true as const }))
      .catch((error: unknown) => ({ ok: false as const, error }));
    if (!mounted.current) return;
    if (!result.ok) {
      rejectAuthorization(result.error);
      setMessage(copy.saveFailed);
      setSaving(false);
      return;
    }
    setDraft(null);
    setRefreshRequired(true);
    const refreshed = await query.refetch();
    if (!mounted.current) return;
    if (refreshed.error) {
      rejectAuthorization(refreshed.error);
      setMessage(copy.refreshFailed);
    } else {
      setRefreshRequired(false);
      setMessage(copy.saved);
    }
    setSaving(false);
  };
  return (
    <AccountSettingsPanel title={copy.tab} description={copy.unavailable}>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-text-muted">{copy.empty}</p>
        {!canUpdateNotifications && <p>{copy.readOnly}</p>}
        {query.isPending && <p role="status">{copy.loading}</p>}
        {query.isError && <p role="alert">{copy.loadFailed}</p>}
        {message && <p role="status">{message}</p>}
        {!denied && (
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={saving || query.isFetching}
            onClick={() => void reload()}
          >
            {copy.retry}
          </button>
        )}
        {data && !denied && !query.isError && (
          <>
            <p>
              {copy.count}: {selected.length} / {data.maxRecipients}
            </p>
            <div className="space-y-3">
              {data.candidates.map((candidate) => (
                <fieldset
                  key={candidate.identityIdentifier}
                  className="rounded-lg border border-stroke-subtle p-3"
                >
                  <legend>{candidate.name}</legend>
                  <div className="flex flex-wrap gap-4">
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.includes(
                          candidate.identityIdentifier,
                        )}
                        disabled={
                          !editable ||
                          (!selected.includes(candidate.identityIdentifier) &&
                            selected.length >= data.maxRecipients)
                        }
                        onChange={(event) => {
                          setMessage(null);
                          setDraft(
                            event.target.checked
                              ? [
                                  ...new Set([
                                    ...selected,
                                    candidate.identityIdentifier,
                                  ]),
                                ]
                              : selected.filter(
                                  (id) => id !== candidate.identityIdentifier,
                                ),
                          );
                        }}
                      />{" "}
                      {copy.email}: {candidate.email}
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        disabled
                        checked={false}
                        readOnly
                      />{" "}
                      LINE
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        disabled
                        checked={false}
                        readOnly
                      />{" "}
                      Kakao
                    </label>
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={!editable}
                onClick={() => {
                  setDraft([]);
                  setMessage(null);
                }}
              >
                {copy.clear}
              </button>
              <button
                className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={!editable}
                onClick={() => void save()}
              >
                {saving ? copy.saving : copy.save}
              </button>
            </div>
          </>
        )}
      </div>
    </AccountSettingsPanel>
  );
}

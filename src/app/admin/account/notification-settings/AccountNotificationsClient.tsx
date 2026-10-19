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
  const rejectAuthorization = (error: unknown) => {
    if (
      isAccountBrowserApiError(error) &&
      [401, 403].includes(error.accountRouteStatus)
    ) {
      if (rejectedError.current === error) return;
      rejectedError.current = error;
      setBlocked(true);
      onAuthorizationRejected();
    }
  };
  const query = useQuery({
    queryKey: [
      "account-notification-settings",
      accountIdentifier,
      accountPrincipalIdentifier,
    ],
    queryFn: () =>
      requestAccountNotificationSettings(accountIdentifier ?? "", locale).catch((error: unknown) => {
        if (mounted.current) rejectAuthorization(error);
        return Promise.reject(error);
      }),
    enabled: Boolean(accountIdentifier && canReadNotifications && !blocked),
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
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
        {!canUpdateNotifications && <p>{copy.readOnly}</p>}
        {query.isPending && <p role="status">{copy.loading}</p>}
        {query.isError && <p role="alert">{copy.loadFailed}</p>}
        {message && <p role="status">{message}</p>}
        {data && !denied && !query.isError && (
          <>
            <div className="space-y-3">
              {data.candidates.map((candidate) => {
                const isSelected = selected.includes(candidate.identityIdentifier);
                const disabled =
                  !editable ||
                  (!isSelected && selected.length >= data.maxRecipients);
                const setRecipientSelected = (checked: boolean) => {
                  setMessage(null);
                  setDraft(
                    checked
                      ? [...new Set([...selected, candidate.identityIdentifier])]
                      : selected.filter((id) => id !== candidate.identityIdentifier),
                  );
                };
                return (
                  <div
                    key={candidate.identityIdentifier}
                    role="group"
                    aria-label={candidate.name}
                    className={`relative flex flex-wrap items-center gap-4 rounded-lg border p-3 focus-within:outline-2 focus-within:outline-brand-primary ${isSelected ? "border-brand-primary bg-brand-primary/5" : "border-stroke-subtle"}`}
                  >
                    <input
                      type="checkbox"
                      aria-label={candidate.name}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={(event) =>
                        setRecipientSelected(event.target.checked)
                      }
                    />
                    <p className="pointer-events-none min-w-0 break-words">{candidate.name}</p>
                    <div className="relative ml-auto flex min-w-0 flex-wrap justify-end gap-4">
                      <label className="min-w-0 break-words">
                        <input
                          type="radio"
                          name={`notification-channel-${candidate.identityIdentifier}`}
                          value="email"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => setRecipientSelected(true)}
                        />{" "}
                        {copy.email}: {candidate.email}
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`notification-channel-${candidate.identityIdentifier}`}
                          value="line"
                          disabled
                          checked={false}
                          readOnly
                        />{" "}
                        LINE
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`notification-channel-${candidate.identityIdentifier}`}
                          value="kakao"
                          disabled
                          checked={false}
                          readOnly
                        />{" "}
                        Kakao
                      </label>
                    </div>
                  </div>
                );
              })}
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

"use client";

import { useAccountSection } from "../AccountSectionContext";
import { maxAccountInvitationEmails } from "../accountInvitationRules";
import { useAccountInvitations } from "./useAccountInvitations";

export function AccountInvitationsClient() {
  const {
    accountIdentifier,
    canInvite,
    principalState,
    t,
  } = useAccountSection();
  const {
    state,
    addEmail,
    removeEmail,
    sendInvitations,
    updateEmailInput,
  } = useAccountInvitations({
    accountIdentifier,
    canInvite,
    principalState,
    t,
  });

  return (
    <section className="mt-5 rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t.accountInvitationsTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">{t.accountInvitationsDescription}</p>
        </div>
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={state.isSending || state.emails.length === 0}
          onClick={sendInvitations}
          type="button"
        >
          {state.isSending ? t.accountInvitationSending : t.accountInvitationSend}
        </button>
      </div>
      <div className="mt-5 grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-2 text-sm font-semibold">
            {t.accountInvitationEmailLabel}
            <input
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={state.isSending || state.emails.length >= maxAccountInvitationEmails}
              onChange={(event) => updateEmailInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addEmail();
                }
              }}
              placeholder={t.accountInvitationEmailPlaceholder}
              value={state.emailInput}
            />
          </label>
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={state.isSending || state.emails.length >= maxAccountInvitationEmails}
            onClick={addEmail}
            type="button"
          >
            {t.accountInvitationAddEmail}
          </button>
        </div>
        <p className="text-xs font-semibold text-text-muted">
          {t.accountInvitationEmailCount(state.emails.length, maxAccountInvitationEmails)}
        </p>
        {state.emails.length > 0 ? (
          <ul className="grid gap-2" aria-label={t.accountInvitationEmailListLabel}>
            {state.emails.map((email) => (
              <li key={email} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-sm">
                <span>{email}</span>
                <button
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={state.isSending}
                  onClick={() => removeEmail(email)}
                  type="button"
                >
                  {t.accountInvitationRemoveEmail}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-stroke-subtle p-4 text-sm font-semibold text-text-muted">
            {t.accountInvitationEmailListEmpty}
          </p>
        )}
        {state.error ? (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">
            {state.success}
          </p>
        ) : null}
      </div>
    </section>
  );
}

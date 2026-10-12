"use client";

import {
  AccountSettingsPanel,
  AccountStatusMessage,
} from "@/components/Account";
import { useAccountSection } from "../AccountSectionContext";
import { useAccountCategoryChange } from "./useAccountCategoryChange";

const getCategoryLabel = (
  labels: Record<string, string>,
  category: string,
): string => labels[category] ?? category;
const buttonClass =
  "rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60";

export function AccountCategoryChangeClient() {
  const { accountIdentifier } = useAccountSection();
  // Account changes discard draft and mutation notifications, including in-flight completions.
  return (
    <AccountCategoryChangePanel key={accountIdentifier ?? "unavailable"} />
  );
}

function AccountCategoryChangePanel() {
  const { accountIdentifier, t } = useAccountSection();
  const state = useAccountCategoryChange({ accountIdentifier, t });
  const labels = t.accountCategoryLabels;
  return (
    <AccountSettingsPanel
      action={
        state.request?.status === "pending" ? (
          <button
            className={buttonClass}
            disabled={!state.canWithdraw}
            onClick={state.withdraw}
            type="button"
          >
            {state.isSubmitting
              ? t.accountCategoryChange.withdrawing
              : t.accountCategoryChange.withdraw}
          </button>
        ) : state.showForm ? (
          <button
            className={buttonClass}
            disabled={!state.canSubmit}
            onClick={state.submit}
            type="button"
          >
            {t.accountCategoryChange.submit}
          </button>
        ) : null
      }
      description={t.accountCategoryChange.description}
      title={t.accountCategoryChange.title}
    >
      <div className="mt-5 grid gap-4">
        {state.isLoading || state.isSubmitting ? (
          <AccountStatusMessage variant="loading">
            {t.accountSettingsLoading}
          </AccountStatusMessage>
        ) : null}
        {state.account ? (
          <p className="text-sm text-text-muted">
            {t.accountCategoryChange.currentCategory}:{" "}
            <span className="font-semibold text-text-strong">
              {getCategoryLabel(labels, state.account.accountCategory)}
            </span>
          </p>
        ) : null}
        {state.request?.status === "pending" ? (
          <section className="rounded-xl border border-stroke-subtle p-4">
            <h3 className="font-semibold text-text-strong">
              {t.accountCategoryChange.statusLabels.pending}
            </h3>
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-text-muted">
                  {t.accountCategoryChange.requestedCategory}
                </dt>
                <dd>
                  {getCategoryLabel(
                    labels,
                    state.request.requestedAccountCategory,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">
                  {t.accountCategoryChangeRequests.requestedAt}
                </dt>
                <dd>{state.request.requestedAt}</dd>
              </div>
            </dl>
          </section>
        ) : null}
        {state.request?.status === "rejected" ? (
          <AccountStatusMessage variant="warning">
            {t.accountCategoryChange.statusLabels.rejected}
            {state.request.rejectionReason ? (
              <>
                :{" "}
                {getCategoryLabel(
                  t.accountCategoryChangeRequestDetail.rejectionReasonLabels,
                  state.request.rejectionReason.code,
                )}{" "}
                {state.request.rejectionReason.detail}
              </>
            ) : null}
          </AccountStatusMessage>
        ) : null}
        {state.showForm ? (
          <fieldset className="grid gap-3" disabled={state.isSubmitting}>
            <legend className="text-sm font-semibold text-text-strong">
              {t.accountCategoryChange.requestedCategory}
            </legend>
            {state.categoryOptions.map((option) => (
              <label
                className="flex items-center gap-2 rounded-lg border border-stroke-subtle p-3 text-sm"
                key={option.value}
              >
                <input
                  checked={state.selectedCategory === option.value}
                  disabled={option.disabled || state.isSubmitting}
                  name="requestedAccountCategory"
                  onChange={() => state.setSelectedCategory(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>{getCategoryLabel(labels, option.value)}</span>
                {option.disabled ? (
                  <span className="text-text-muted">
                    {t.accountCategoryChange.currentCategoryBadge}
                  </span>
                ) : null}
              </label>
            ))}
          </fieldset>
        ) : null}
        {state.success ? (
          <AccountStatusMessage variant="success">
            {state.success}
          </AccountStatusMessage>
        ) : null}
        {state.error ? (
          <AccountStatusMessage variant="error">
            {state.error}
          </AccountStatusMessage>
        ) : null}
        {state.loadError ? (
          <>
            <AccountStatusMessage variant="error">
              {state.loadError}
            </AccountStatusMessage>
            <button
              className="w-fit rounded-lg border border-stroke-subtle px-3 py-2 text-sm disabled:opacity-60"
              disabled={
                state.isLoading || state.isSubmitting || !accountIdentifier
              }
              onClick={state.retry}
              type="button"
            >
              {t.accountCategoryChange.retry}
            </button>
          </>
        ) : null}
      </div>
    </AccountSettingsPanel>
  );
}

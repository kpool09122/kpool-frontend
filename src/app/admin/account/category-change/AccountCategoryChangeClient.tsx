"use client";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import { useAccountSection } from "../AccountSectionContext";
import { useAccountCategoryChange } from "./useAccountCategoryChange";

const getCategoryLabel = (labels: Record<string, string>, category: string): string => labels[category] ?? category;

export function AccountCategoryChangeClient() {
  const { accountIdentifier, t } = useAccountSection();
  const state = useAccountCategoryChange({ accountIdentifier, t });
  const labels = t.accountCategoryLabels;
  return (
    <AccountSettingsPanel
      action={<button className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" disabled={state.isSubmitting || state.selectedCategory === state.currentCategory} onClick={state.submit} type="button">{state.isSubmitting ? t.accountCategoryChange.submitting : t.accountCategoryChange.submit}</button>}
      description={t.accountCategoryChange.description}
      title={t.accountCategoryChange.title}
    >
      <div className="mt-5 grid gap-4">
        {state.isLoading ? <AccountStatusMessage variant="loading">{t.accountSettingsLoading}</AccountStatusMessage> : null}
        {state.account ? <p className="text-sm text-text-muted">{t.accountCategoryChange.currentCategory}: <span className="font-semibold text-text-strong">{getCategoryLabel(labels, state.account.accountCategory)}</span></p> : null}
        <fieldset className="grid gap-3" disabled={state.isSubmitting}>
          <legend className="text-sm font-semibold text-text-strong">{t.accountCategoryChange.requestedCategory}</legend>
          {state.categoryOptions.map((option) => (
            <label className="flex items-center gap-2 rounded-lg border border-stroke-subtle p-3 text-sm" key={option.value}>
              <input checked={state.selectedCategory === option.value} disabled={option.disabled || state.isSubmitting} name="requestedAccountCategory" onChange={() => state.setSelectedCategory(option.value)} type="radio" value={option.value} />
              <span>{getCategoryLabel(labels, option.value)}</span>
              {option.disabled ? <span className="text-text-muted">{t.accountCategoryChange.currentCategoryBadge}</span> : null}
            </label>
          ))}
        </fieldset>
        {state.success ? <AccountStatusMessage variant="success">{state.success}</AccountStatusMessage> : null}
        {state.error ? <AccountStatusMessage variant="error">{state.error}</AccountStatusMessage> : null}
      </div>
    </AccountSettingsPanel>
  );
}

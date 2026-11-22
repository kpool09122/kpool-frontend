"use client";

import { AdminSectionTabs } from "../AdminSectionTabs";
import type { ReactNode } from "react";

import type { useI18n } from "../../../i18n/I18nProvider";
import { adminWikiTabRoutes, type AdminWikiTab } from "../adminTypes";
import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import { getWikiCategory, getWikiNavigationGroups } from "./wikiNavigation";

type WikiLayoutClientProps = {
  canViewOfficialVideoInbox: boolean;
  children: (activeWikiTab: AdminWikiTab) => ReactNode;
  isAuthenticated: boolean;
  isPending: boolean;
  selectedWikiTab: AdminWikiTab;
  state: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
  onActivate: () => void;
  onRetry: () => void;
  onOpenCreateDraftWiki: () => void;
};

export function WikiLayoutClient({
  canViewOfficialVideoInbox,
  children,
  isAuthenticated,
  isPending,
  selectedWikiTab,
  state,
  t,
  onActivate,
  onRetry,
  onOpenCreateDraftWiki,
}: WikiLayoutClientProps) {
  const canActivate = isAuthenticated && !isPending;

  if (state.status === "loading") {
    return (
      <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
        <h2 className="text-xl font-semibold">{t.wikiLoadingTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          {t.wikiLoadingMessage}
        </p>
      </div>
    );
  }

  if (state.status === "available" && state.principal.status !== "active") {
    return <section role="alert" className="rounded-xl border border-stroke-subtle bg-surface-raised p-6">
      <p>{t.principalStatus.inactive}</p>
    </section>;
  }

  if (state.status === "available") {
    const groups = getWikiNavigationGroups(state.principal, t, canViewOfficialVideoInbox);
    const selectedCategory = getWikiCategory(selectedWikiTab);
    const tabs = (groups.find((group) => group.id === selectedCategory) ?? groups[0]).tabs;
    const activeWikiTab = tabs.some((tab) => tab.id === selectedWikiTab)
      ? selectedWikiTab
      : tabs[0].id;

    return (
      <section className="space-y-5">
        {getWikiCategory(activeWikiTab) === "wiki" ? (
          <div className="flex justify-end">
            <button
              className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105"
              onClick={onOpenCreateDraftWiki}
              type="button"
            >
              {t.createWiki}
            </button>
          </div>
        ) : null}
        <AdminSectionTabs
          label={t.wikiTabsLabel}
          tabs={tabs.map(tab => ({ ...tab, href: adminWikiTabRoutes[tab.id] }))}
          activeTab={activeWikiTab}
        />
        {children(activeWikiTab)}
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
        <h2 className="text-xl font-semibold">{t.wikiErrorTitle}</h2>
        <p role="alert" className="mt-3 text-sm leading-7 text-text-muted">
          {state.message}
        </p>
        <button
          type="button"
          className="mt-5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105"
          onClick={onRetry}
        >
          {t.retryPrincipal}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
      <h2 className="text-xl font-semibold">{t.wikiMissingTitle}</h2>
      <p className="mt-3 text-sm leading-7 text-text-muted">
        {t.wikiMissingMessage}
      </p>
      {!canActivate ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-text-muted">
          {isAuthenticated ? t.accountUnavailableMessage : t.identityUnavailableMessage}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canActivate}
        onClick={onActivate}
      >
        {t.activateWiki}
      </button>
    </div>
  );
}

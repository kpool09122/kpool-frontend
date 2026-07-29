"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  canPublishWikiDraftWikis,
  canReviewWikiDraftImages,
  canReviewWikiDraftWikis,
  canReviewWikiImageDeletionRequests,
  type WikiPrincipalState,
} from "@/gateways/wiki/wikiPrincipal";
import type { useI18n } from "../../../i18n/I18nProvider";
import {
  adminWikiTabRoutes,
  type AdminWikiTab,
} from "../adminTypes";

const createWikiTab = (id: AdminWikiTab, label: string): { id: AdminWikiTab; label: string } => ({
  id,
  label,
});

type WikiLayoutClientProps = {
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

  if (state.status === "available") {
    const canReviewDraftImages = canReviewWikiDraftImages(state.principal);
    const canReviewImageDeletionRequests = canReviewWikiImageDeletionRequests(state.principal);
    const canReviewDraftWikis = canReviewWikiDraftWikis(state.principal);
    const canPublishDraftWikis = canPublishWikiDraftWikis(state.principal);

    const tabs: Array<{ id: AdminWikiTab; label: string }> = [
      createWikiTab("editingWikis", t.editingWikisTab),
      createWikiTab("submittedWikis", t.submittedWikisTab),
      ...(canReviewDraftWikis ? [createWikiTab("unapprovedWikis", t.unapprovedWikisTab)] : []),
      ...(canPublishDraftWikis ? [createWikiTab("approvedWikis", t.approvedWikisTab)] : []),
      ...(canPublishDraftWikis ? [createWikiTab("untranslatedWikis", t.untranslatedWikisTab)] : []),
      ...(canReviewDraftImages ? [createWikiTab("draftImages", t.draftImagesTab)] : []),
      ...(canReviewImageDeletionRequests ? [createWikiTab("imageDeletionRequests", t.imageDeletionRequestsTab)] : []),
    ];
    const activeWikiTab = tabs.some((tab) => tab.id === selectedWikiTab)
      ? selectedWikiTab
      : tabs[0].id;

    return (
      <section className="space-y-5">
        <div className="flex justify-end">
          <button
            className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
            onClick={onOpenCreateDraftWiki}
            type="button"
          >
            {t.createWiki}
          </button>
        </div>
        <div className="overflow-x-auto border-b border-stroke-subtle">
          <div aria-label={t.wikiTabsLabel} className="-mb-px flex gap-1" role="tablist">
            {tabs.map((tab) => (
              <Link
                aria-selected={activeWikiTab === tab.id}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  activeWikiTab === tab.id
                    ? "border-brand-primary text-text-strong"
                    : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
                }`}
                key={tab.id}
                href={adminWikiTabRoutes[tab.id]}
                role="tab"
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
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
          className="mt-5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
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
        className="mt-5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canActivate}
        onClick={onActivate}
      >
        {t.activateWiki}
      </button>
    </div>
  );
}

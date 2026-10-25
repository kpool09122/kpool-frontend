"use client";

import { useId, useState } from "react";
import type { WikiPublishMethod } from "@/gateways/wiki/draftWiki";

import { useAdmin } from "../../AdminProvider";
import { useAdminRouteData } from "../../AdminRouteProvider";
import {
  OfficialCertificationBadge,
  WikiListCard,
  WikiListCardActionButton,
  WikiListPanel,
} from "../../../../components/Wiki";
import {
  buildDraftWikiListCardStyle,
  DraftWikiRejectionReasonButton,
  getDraftWikiListCardHref,
  getDraftWikiListCardMeta,
  getDraftWikiRejectionReason,
  getDraftWikiResourceLabel,
} from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";
import { useApprovedDraftWikis } from "./useApprovedDraftWikis";

export function ApprovedWikisClient() {
  const tab = "approvedWikis";
  const [publishWikiIdentifier, setPublishWikiIdentifier] = useState<
    string | null
  >(null);
  const { currentIdentity, locale, t } = useAdmin();
  const { initialDraftWikis } = useAdminRouteData();
  const { draftWikiAdapter } = useWikiSection();
  const {
    draftWiki,
    loadDraftWikisPage,
    publishDraftWiki,
    reviewError,
    reviewingWikiIdentifier,
  } = useApprovedDraftWikis({
    adapter: draftWikiAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialDraftWiki: initialDraftWikis.approvedWikis,
    messages: {
      draftWikiListLoadFailed: t.draftWikiListLoadFailed,
      draftWikiPublishFailed: t.draftWikiPublishFailed,
    },
  });
  const canLoadMore = draftWiki.pageInfo
    ? draftWiki.pageInfo.current_page < draftWiki.pageInfo.last_page
    : false;

  return (
    <WikiListPanel
      allLoadedLabel={t.allDraftWikisLoaded}
      canLoadMore={canLoadMore}
      emptyMessage={t.approvedWikiListEmptyMessage}
      emptyTitle={t.approvedWikiListEmptyTitle}
      isEmpty={draftWiki.wikis.length === 0}
      isInitialLoading={draftWiki.isInitialLoading}
      isLoadingMore={draftWiki.isLoadingMore}
      loadError={draftWiki.loadError}
      loadingLabel={t.approvedWikiListLoading}
      loadingMoreLabel={t.draftWikiListLoadingMore}
      loadMoreLabel={t.loadMoreDraftWikis}
      reloadLabel={t.reloadDraftWikis}
      reviewError={publishWikiIdentifier === null ? reviewError : null}
      totalLabel={
        draftWiki.pageInfo
          ? t.approvedWikiListTotal(draftWiki.pageInfo.total)
          : null
      }
      onLoadMore={() => {
        if (draftWiki.pageInfo) {
          loadDraftWikisPage(draftWiki.pageInfo.current_page + 1);
        }
      }}
      onReload={() => loadDraftWikisPage(1)}
    >
      {draftWiki.wikis.map((wiki) => {
        const isOnImage = wiki.isHidden !== true && Boolean(wiki.imageUrl);
        const style = buildDraftWikiListCardStyle(wiki);

        return (
          <WikiListCard
            actions={
              <ApprovedWikiActions
                error={publishWikiIdentifier === wiki.wikiIdentifier ? reviewError : null}
                canPublishSameVersion={
                  "publishedWikiIdentifier" in wiki &&
                  Boolean(wiki.publishedWikiIdentifier)
                }
                disabled={reviewingWikiIdentifier !== null}
                isOpen={publishWikiIdentifier === wiki.wikiIdentifier}
                isPublishing={reviewingWikiIdentifier === wiki.wikiIdentifier}
                onOpen={() => setPublishWikiIdentifier(wiki.wikiIdentifier)}
                onClose={() => setPublishWikiIdentifier(null)}
                onPublish={(publishMethod) =>
                  publishDraftWiki(wiki, publishMethod)
                }
              />
            }
            badgeLabel={getDraftWikiResourceLabel(t, wiki.resourceType)}
            hasTheme={!isOnImage && Boolean(style)}
            headerActions={
              <DraftWikiRejectionReasonButton
                reason={getDraftWikiRejectionReason(wiki)}
                t={t}
              />
            }
            href={getDraftWikiListCardHref(wiki, tab)}
            isOnImage={isOnImage}
            key={wiki.wikiIdentifier}
            meta={getDraftWikiListCardMeta({ locale, t, wiki })}
            style={style}
            subtitle={wiki.language}
            title={wiki.name}
            titleAdornment={
              wiki.isOfficial === true ? <OfficialCertificationBadge /> : null
            }
          />
        );
      })}
    </WikiListPanel>
  );
}

function ApprovedWikiActions({
  error,
  canPublishSameVersion,
  disabled,
  isOpen,
  isPublishing,
  onOpen,
  onClose,
  onPublish,
}: {
  error: string | null;
  canPublishSameVersion: boolean;
  disabled: boolean;
  isOpen: boolean;
  isPublishing: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPublish: (method: WikiPublishMethod) => void;
}) {
  const { t } = useAdmin();

  return (
    <div className="mt-4">
      <WikiListCardActionButton
        disabled={disabled}
        onClick={onOpen}
        variant="primary"
      >
        {t.publishDraftWiki}
      </WikiListCardActionButton>
      {isOpen ? (
        <PublishWikiDialog
          error={error}
          canPublishSameVersion={canPublishSameVersion}
          disabled={disabled}
          isPublishing={isPublishing}
          onClose={onClose}
          onPublish={onPublish}
        />
      ) : null}
    </div>
  );
}

function PublishWikiDialog({
  error,
  canPublishSameVersion,
  disabled,
  isPublishing,
  onClose,
  onPublish,
}: {
  error: string | null;
  canPublishSameVersion: boolean;
  disabled: boolean;
  isPublishing: boolean;
  onClose: () => void;
  onPublish: (method: WikiPublishMethod) => void;
}) {
  const { t } = useAdmin();
  const titleId = useId();
  const [method, setMethod] = useState<WikiPublishMethod>("next-generation");

  return (
    <dialog
      ref={openPublishDialog}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border border-stroke-subtle bg-surface-raised p-6 text-text-strong shadow-soft backdrop:bg-black/45"
      onCancel={(event) => {
        event.preventDefault();
        if (!disabled) onClose();
      }}
    >
      <h2 id={titleId} className="text-xl font-semibold">
        {t.wikiPublishMethod}
      </h2>
      {error ? (
        <p className="mt-4 text-sm text-status-danger" role="alert">
          {error}
        </p>
      ) : null}
      <fieldset
        aria-labelledby={titleId}
        className="mt-5 grid gap-3"
        disabled={disabled}
      >
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="publishMethod"
            checked={method === "next-generation"}
            onChange={() => setMethod("next-generation")}
          />
          <span>
            {t.wikiPublishNextGeneration}
            <span className="block text-xs text-text-muted">
              {t.wikiPublishNextGenerationDescription}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="publishMethod"
            checked={method === "same-version"}
            disabled={!canPublishSameVersion}
            onChange={() => setMethod("same-version")}
          />
          <span>
            {t.wikiPublishSameVersion}
            <span className="block text-xs text-text-muted">
              {t.wikiPublishSameVersionDescription}
            </span>
          </span>
        </label>
        {!canPublishSameVersion ? (
          <p className="text-xs text-text-muted">
            {t.wikiPublishFirstPublication}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <WikiListCardActionButton
            disabled={disabled}
            onClick={() =>
              onPublish(canPublishSameVersion ? method : "next-generation")
            }
            variant="primary"
          >
            {isPublishing ? t.draftWikiPublishing : t.wikiPublishConfirm}
          </WikiListCardActionButton>
          <WikiListCardActionButton disabled={disabled} onClick={onClose}>
            {t.wikiPublishCancel}
          </WikiListCardActionButton>
        </div>
      </fieldset>
    </dialog>
  );
}

const openPublishDialog = (dialog: HTMLDialogElement | null) => {
  if (!dialog) return;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  return () => {
    dialog.close?.();
    opener?.focus();
  };
};

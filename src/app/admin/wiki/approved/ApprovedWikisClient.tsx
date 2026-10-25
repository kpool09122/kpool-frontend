"use client";

import { useState } from "react";
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
      reviewError={reviewError}
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
  canPublishSameVersion,
  disabled,
  isOpen,
  isPublishing,
  onOpen,
  onClose,
  onPublish,
}: {
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
      {isOpen ? (
        <PublishWikiOptions
          canPublishSameVersion={canPublishSameVersion}
          disabled={disabled}
          isPublishing={isPublishing}
          onClose={onClose}
          onPublish={onPublish}
        />
      ) : (
        <WikiListCardActionButton
          disabled={disabled}
          onClick={onOpen}
          variant="primary"
        >
          {t.publishDraftWiki}
        </WikiListCardActionButton>
      )}
    </div>
  );
}

function PublishWikiOptions({
  canPublishSameVersion,
  disabled,
  isPublishing,
  onClose,
  onPublish,
}: {
  canPublishSameVersion: boolean;
  disabled: boolean;
  isPublishing: boolean;
  onClose: () => void;
  onPublish: (method: WikiPublishMethod) => void;
}) {
  const { t } = useAdmin();
  const [method, setMethod] = useState<WikiPublishMethod>("next-generation");

  return (
    <fieldset
      className="grid gap-3 rounded-lg border border-stroke-subtle bg-surface-base p-3 text-text-strong"
      disabled={disabled}
    >
      <legend className="px-1 text-sm font-semibold">
        {t.wikiPublishMethod}
      </legend>
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
  );
}

"use client";

import { useState } from "react";

import type { MyPageWikiListItem } from "../../useMyPageDraftWikis";
import { useMypage } from "../../MypageProvider";
import {
  WikiListCard,
  WikiListCardActionButton,
  WikiListCardActionLink,
  WikiListCardDisabledAction,
  WikiListPanel,
} from "../../../../components/Wiki";
import {
  buildDraftWikiListCardStyle,
  DraftWikiRejectionReasonButton,
  getDraftWikiListCardHref,
  getDraftWikiListCardMeta,
  getDraftWikiRejectionReason,
  getDraftWikiResourceLabel,
  RejectDraftWikiDialog,
} from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";
import { useUnapprovedDraftWikis } from "./useUnapprovedDraftWikis";

type RejectDraftWikiDialogState = {
  isOpen: boolean;
  reason: string;
  wiki: MyPageWikiListItem | null;
};

export function UnapprovedWikisClient() {
  const tab = "unapprovedWikis";
  const { currentIdentity, initialDraftWikis, locale, t } = useMypage();
  const { draftWikiAdapter } = useWikiSection();
  const [rejectDialog, setRejectDialog] = useState<RejectDraftWikiDialogState>({
    isOpen: false,
    reason: "",
    wiki: null,
  });
  const {
    approveDraftWiki,
    draftWiki,
    loadDraftWikisPage,
    rejectDraftWiki,
    reviewError,
    reviewingWikiIdentifier,
  } = useUnapprovedDraftWikis({
    adapter: draftWikiAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialDraftWiki: initialDraftWikis.unapprovedWikis,
    messages: {
      draftWikiApproveFailed: t.draftWikiApproveFailed,
      draftWikiListLoadFailed: t.draftWikiListLoadFailed,
      draftWikiRejectFailed: t.draftWikiRejectFailed,
    },
  });

  const closeRejectDialog = () => {
    if (reviewingWikiIdentifier) {
      return;
    }

    setRejectDialog({
      isOpen: false,
      reason: "",
      wiki: null,
    });
  };

  const submitRejectDialog = (reason: string) => {
    const wiki = rejectDialog.wiki;

    if (!wiki) {
      return;
    }

    rejectDraftWiki(wiki, reason);
    setRejectDialog({
      isOpen: false,
      reason: "",
      wiki: null,
    });
  };
  const canLoadMore = draftWiki.pageInfo
    ? draftWiki.pageInfo.current_page < draftWiki.pageInfo.last_page
    : false;

  return (
    <>
      <WikiListPanel
        allLoadedLabel={t.allDraftWikisLoaded}
        canLoadMore={canLoadMore}
        emptyMessage={t.unapprovedWikiListEmptyMessage}
        emptyTitle={t.unapprovedWikiListEmptyTitle}
        isEmpty={draftWiki.wikis.length === 0}
        isInitialLoading={draftWiki.isInitialLoading}
        isLoadingMore={draftWiki.isLoadingMore}
        loadError={draftWiki.loadError}
        loadingLabel={t.unapprovedWikiListLoading}
        loadingMoreLabel={t.draftWikiListLoadingMore}
        loadMoreLabel={t.loadMoreDraftWikis}
        reloadLabel={t.reloadDraftWikis}
        reviewError={reviewError}
        totalLabel={draftWiki.pageInfo ? t.unapprovedWikiListTotal(draftWiki.pageInfo.total) : null}
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
                <UnapprovedWikiActions
                  isOnImage={isOnImage}
                  isReviewing={reviewingWikiIdentifier === wiki.wikiIdentifier}
                  wiki={wiki}
                  onApprove={() => approveDraftWiki(wiki)}
                  onReject={() => {
                    setRejectDialog({
                      isOpen: true,
                      reason: "",
                      wiki,
                    });
                  }}
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
            />
          );
        })}
      </WikiListPanel>
      <RejectDraftWikiDialog
        isOpen={rejectDialog.isOpen}
        isSubmitting={Boolean(reviewingWikiIdentifier)}
        t={t}
        onClose={closeRejectDialog}
        onSubmit={submitRejectDialog}
      />
    </>
  );
}

function UnapprovedWikiActions({
  isOnImage,
  isReviewing,
  wiki,
  onApprove,
  onReject,
}: {
  isOnImage: boolean;
  isReviewing: boolean;
  wiki: MyPageWikiListItem;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useMypage();
  const diffHref = `/wiki/diff/${encodeURIComponent(wiki.wikiIdentifier)}?resourceType=${encodeURIComponent(wiki.resourceType)}`;
  const canOpenDiff = "publishedWikiIdentifier" in wiki && wiki.publishedWikiIdentifier !== null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <WikiListCardActionButton
        disabled={isReviewing}
        onClick={onApprove}
        variant="primary"
      >
        {isReviewing ? t.draftWikiReviewing : t.approveDraftWiki}
      </WikiListCardActionButton>
      <WikiListCardActionButton
        disabled={isReviewing}
        isOnImage={isOnImage}
        onClick={onReject}
      >
        {isReviewing ? t.draftWikiReviewing : t.rejectDraftWiki}
      </WikiListCardActionButton>
      {canOpenDiff ? (
        <WikiListCardActionLink href={diffHref} isOnImage={isOnImage}>
          {t.compareDraftWikiDiff}
        </WikiListCardActionLink>
      ) : (
        <WikiListCardDisabledAction isOnImage={isOnImage}>
          {t.compareDraftWikiDiff}
        </WikiListCardDisabledAction>
      )}
    </div>
  );
}

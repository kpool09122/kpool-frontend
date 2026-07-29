"use client";

import { useMypage } from "../../MypageProvider";
import {
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
import { useSubmittedDraftWikis } from "./useSubmittedDraftWikis";

export function SubmittedWikisClient() {
  const tab = "submittedWikis";
  const { currentIdentity, initialDraftWikis, locale, t } = useMypage();
  const { draftWikiAdapter } = useWikiSection();
  const {
    draftWiki,
    loadDraftWikisPage,
    reviewError,
    reviewingWikiIdentifier,
    withdrawDraftWiki
  } = useSubmittedDraftWikis({
    adapter: draftWikiAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialDraftWiki: initialDraftWikis.submittedWikis,
    messages: {
      draftWikiListLoadFailed: t.draftWikiListLoadFailed,
      draftWikiWithdrawFailed: t.draftWikiWithdrawFailed,
    },
  });
  const canLoadMore = draftWiki.pageInfo
    ? draftWiki.pageInfo.current_page < draftWiki.pageInfo.last_page
    : false;

  return (
    <WikiListPanel
      allLoadedLabel={t.allDraftWikisLoaded}
      canLoadMore={canLoadMore}
      emptyMessage={t.submittedWikiListEmptyMessage}
      emptyTitle={t.submittedWikiListEmptyTitle}
      isEmpty={draftWiki.wikis.length === 0}
      isInitialLoading={draftWiki.isInitialLoading}
      isLoadingMore={draftWiki.isLoadingMore}
      loadError={draftWiki.loadError}
      loadingLabel={t.submittedWikiListLoading}
      loadingMoreLabel={t.draftWikiListLoadingMore}
      loadMoreLabel={t.loadMoreDraftWikis}
      reloadLabel={t.reloadDraftWikis}
      reviewError={reviewError}
      totalLabel={draftWiki.pageInfo ? t.submittedWikiListTotal(draftWiki.pageInfo.total) : null}
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
              <SubmittedWikiActions
                isOnImage={isOnImage}
                isWithdrawing={reviewingWikiIdentifier === wiki.wikiIdentifier}
                onWithdraw={() => withdrawDraftWiki(wiki)}
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
  );
}

function SubmittedWikiActions({
  isOnImage,
  isWithdrawing,
  onWithdraw,
}: {
  isOnImage: boolean;
  isWithdrawing: boolean;
  onWithdraw: () => void;
}) {
  const { t } = useMypage();

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <WikiListCardActionButton
        disabled={isWithdrawing}
        isOnImage={isOnImage}
        onClick={onWithdraw}
      >
        {isWithdrawing ? t.draftWikiWithdrawing : t.withdrawDraftWiki}
      </WikiListCardActionButton>
    </div>
  );
}

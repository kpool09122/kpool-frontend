"use client";

import { useAdmin } from "../../AdminProvider";
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
  const { currentIdentity, initialDraftWikis, locale, t } = useAdmin();
  const { draftWikiAdapter } = useWikiSection();
  const {
    draftWiki,
    loadDraftWikisPage,
    publishDraftWiki,
    reviewError,
    reviewingWikiIdentifier
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
      totalLabel={draftWiki.pageInfo ? t.approvedWikiListTotal(draftWiki.pageInfo.total) : null}
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
                isPublishing={reviewingWikiIdentifier === wiki.wikiIdentifier}
                onPublish={() => publishDraftWiki(wiki)}
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
            titleAdornment={wiki.isOfficial === true ? <OfficialCertificationBadge /> : null}
          />
        );
      })}
    </WikiListPanel>
  );
}

function ApprovedWikiActions({
  isPublishing,
  onPublish,
}: {
  isPublishing: boolean;
  onPublish: () => void;
}) {
  const { t } = useAdmin();

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <WikiListCardActionButton
        disabled={isPublishing}
        onClick={onPublish}
        variant="primary"
      >
        {isPublishing ? t.draftWikiPublishing : t.publishDraftWiki}
      </WikiListCardActionButton>
    </div>
  );
}

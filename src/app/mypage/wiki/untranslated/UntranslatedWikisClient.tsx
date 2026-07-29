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
import { useUntranslatedWikis } from "./useUntranslatedWikis";

export function UntranslatedWikisClient() {
  const tab = "untranslatedWikis";
  const { currentIdentity, initialDraftWikis, locale, t } = useMypage();
  const { draftWikiAdapter } = useWikiSection();
  const {
    draftWiki,
    loadDraftWikisPage,
    reviewError,
    reviewingWikiIdentifier,
    translateWiki
  } = useUntranslatedWikis({
    adapter: draftWikiAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialDraftWiki: initialDraftWikis.untranslatedWikis,
    messages: {
      draftWikiListLoadFailed: t.draftWikiListLoadFailed,
      draftWikiTranslateFailed: t.draftWikiTranslateFailed,
    },
  });
  const canLoadMore = draftWiki.pageInfo
    ? draftWiki.pageInfo.current_page < draftWiki.pageInfo.last_page
    : false;

  return (
    <WikiListPanel
      allLoadedLabel={t.allDraftWikisLoaded}
      canLoadMore={canLoadMore}
      emptyMessage={t.untranslatedWikiListEmptyMessage}
      emptyTitle={t.untranslatedWikiListEmptyTitle}
      isEmpty={draftWiki.wikis.length === 0}
      isInitialLoading={draftWiki.isInitialLoading}
      isLoadingMore={draftWiki.isLoadingMore}
      loadError={draftWiki.loadError}
      loadingLabel={t.untranslatedWikiListLoading}
      loadingMoreLabel={t.draftWikiListLoadingMore}
      loadMoreLabel={t.loadMoreDraftWikis}
      reloadLabel={t.reloadDraftWikis}
      reviewError={reviewError}
      totalLabel={draftWiki.pageInfo ? t.untranslatedWikiListTotal(draftWiki.pageInfo.total) : null}
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
              <UntranslatedWikiActions
                isTranslating={reviewingWikiIdentifier === wiki.wikiIdentifier}
                onTranslate={() => translateWiki(wiki)}
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

function UntranslatedWikiActions({
  isTranslating,
  onTranslate,
}: {
  isTranslating: boolean;
  onTranslate: () => void;
}) {
  const { t } = useMypage();

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <WikiListCardActionButton
        disabled={isTranslating}
        onClick={onTranslate}
        variant="primary"
      >
        {isTranslating ? t.draftWikiTranslating : t.translateDraftWiki}
      </WikiListCardActionButton>
    </div>
  );
}

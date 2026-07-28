"use client";

import { useMypage } from "../../MypageProvider";
import { DraftWikiListPanel } from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";

export function UnapprovedWikisClient() {
  const tab = "unapprovedWikis";
  const {
    deletingWikiIdentifier,
    draftWikiReviewError,
    draftWikis,
    onDeleteDraftWiki,
    onLoadDraftWikisPage,
    onReviewDraftWiki,
    onWithdrawDraftWiki,
    reviewingWikiIdentifier,
  } = useWikiSection();
  const { locale, t } = useMypage();
  const state = draftWikis[tab];

  return (
    <DraftWikiListPanel
      deletingWikiIdentifier={deletingWikiIdentifier}
      locale={locale}
      reviewError={draftWikiReviewError}
      reviewingWikiIdentifier={reviewingWikiIdentifier}
      state={state}
      t={t}
      tab={tab}
      onLoadMore={() => {
        if (state.pageInfo) {
          onLoadDraftWikisPage(tab, state.pageInfo.current_page + 1);
        }
      }}
      onReload={() => onLoadDraftWikisPage(tab, 1)}
      onDeleteDraftWiki={onDeleteDraftWiki}
      onReviewDraftWiki={onReviewDraftWiki}
      onWithdrawDraftWiki={onWithdrawDraftWiki}
    />
  );
}

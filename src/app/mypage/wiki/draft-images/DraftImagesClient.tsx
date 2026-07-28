"use client";

import { useMypage } from "../../MypageProvider";
import { useMyPageDraftImageReview } from "../../useMyPageDraftImageReview";
import { DraftImageListPanel } from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";

export function DraftImagesClient() {
  const { currentIdentity, initialDraftImages, locale, t } = useMypage();
  const { draftImageAdapter } = useWikiSection();
  const {
    draftImages,
    loadDraftImagesPage,
    reviewError,
    reviewDraftImage,
    reviewingImageIdentifier,
  } = useMyPageDraftImageReview({
    adapter: draftImageAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialDraftImages,
    messages: {
      draftImageApproveFailed: t.draftImageApproveFailed,
      draftImageListLoadFailed: t.draftImageListLoadFailed,
      draftImageRejectFailed: t.draftImageRejectFailed,
    },
  });

  return (
    <DraftImageListPanel
      locale={locale}
      reviewError={reviewError}
      reviewingImageIdentifier={reviewingImageIdentifier}
      state={draftImages}
      t={t}
      onLoadMore={() => {
        if (draftImages.pageInfo) {
          loadDraftImagesPage(draftImages.pageInfo.current_page + 1);
        }
      }}
      onReload={() => loadDraftImagesPage(1)}
      onReviewDraftImage={reviewDraftImage}
    />
  );
}

"use client";

import { useMypage } from "../../MypageProvider";
import { DraftImageListPanel } from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";

export function DraftImagesClient() {
  const {
    draftImages,
    onLoadDraftImagesPage,
    onReviewDraftImage,
    reviewError,
    reviewingImageIdentifier,
  } = useWikiSection();
  const { locale, t } = useMypage();

  return (
    <DraftImageListPanel
      locale={locale}
      reviewError={reviewError}
      reviewingImageIdentifier={reviewingImageIdentifier}
      state={draftImages}
      t={t}
      onLoadMore={() => {
        if (draftImages.pageInfo) {
          onLoadDraftImagesPage(draftImages.pageInfo.current_page + 1);
        }
      }}
      onReload={() => onLoadDraftImagesPage(1)}
      onReviewDraftImage={onReviewDraftImage}
    />
  );
}

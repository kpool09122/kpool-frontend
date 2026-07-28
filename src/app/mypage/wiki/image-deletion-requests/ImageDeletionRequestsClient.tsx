"use client";

import { useMypage } from "../../MypageProvider";
import { ImageDeletionRequestListPanel } from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";

export function ImageDeletionRequestsClient() {
  const {
    imageDeletionRequestReviewError,
    imageDeletionRequests,
    onLoadImageDeletionRequestsPage,
    onReviewImageDeletionRequest,
    reviewingImageDeletionRequestIdentifier,
  } = useWikiSection();
  const { locale, t } = useMypage();

  return (
    <ImageDeletionRequestListPanel
      locale={locale}
      reviewError={imageDeletionRequestReviewError}
      reviewingImageIdentifier={reviewingImageDeletionRequestIdentifier}
      state={imageDeletionRequests}
      t={t}
      onLoadMore={() => {
        if (imageDeletionRequests.pageInfo) {
          onLoadImageDeletionRequestsPage(imageDeletionRequests.pageInfo.current_page + 1);
        }
      }}
      onReload={() => onLoadImageDeletionRequestsPage(1)}
      onReviewImageDeletionRequest={onReviewImageDeletionRequest}
    />
  );
}

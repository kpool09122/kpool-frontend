"use client";

import { useMypage } from "../../MypageProvider";
import { useMyPageImageDeletionRequestReview } from "../../useMyPageImageDeletionRequestReview";
import { ImageDeletionRequestListPanel } from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";

export function ImageDeletionRequestsClient() {
  const { currentIdentity, initialImageDeletionRequests, locale, t } = useMypage();
  const { draftImageAdapter } = useWikiSection();
  const {
    imageDeletionRequests,
    loadImageDeletionRequestsPage,
    reviewError,
    reviewImageDeletionRequest,
    reviewingImageIdentifier: reviewingImageDeletionRequestIdentifier,
  } = useMyPageImageDeletionRequestReview({
    adapter: draftImageAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialImageDeletionRequests,
    messages: {
      imageDeletionRequestApproveFailed: t.imageDeletionRequestApproveFailed,
      imageDeletionRequestListLoadFailed: t.imageDeletionRequestListLoadFailed,
      imageDeletionRequestRejectFailed: t.imageDeletionRequestRejectFailed,
    },
  });

  return (
      <ImageDeletionRequestListPanel
        locale={locale}
      reviewError={reviewError}
      reviewingImageIdentifier={reviewingImageDeletionRequestIdentifier}
      state={imageDeletionRequests}
      t={t}
      onLoadMore={() => {
        if (imageDeletionRequests.pageInfo) {
          loadImageDeletionRequestsPage(imageDeletionRequests.pageInfo.current_page + 1);
        }
      }}
      onReload={() => loadImageDeletionRequestsPage(1)}
      onReviewImageDeletionRequest={reviewImageDeletionRequest}
    />
  );
}

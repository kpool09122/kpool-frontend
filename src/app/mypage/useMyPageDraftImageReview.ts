"use client";

import { useCallback, useState } from "react";

import {
  defaultWikiImagePerPage,
  type WikiDraftImage,
  type WikiDraftImageListResponse,
} from "@kpool/wiki";
import type { MyPageDraftImageAdapter } from "@/gateways/mypage/myPageAdapters";

export type DraftImageListState = {
  images: WikiDraftImage[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiDraftImageListResponse, "current_page" | "last_page" | "total"> | null;
};

type MyPageDraftImageReviewMessages = {
  draftImageApproveFailed: string;
  draftImageListLoadFailed: string;
  draftImageRejectFailed: string;
};

export const initialDraftImageListState: DraftImageListState = {
  images: [],
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
};

export const useMyPageDraftImageReview = ({
  adapter,
  initialDraftImages,
  messages,
}: {
  adapter: MyPageDraftImageAdapter;
  initialDraftImages: DraftImageListState;
  messages: MyPageDraftImageReviewMessages;
}) => {
  const [draftImages, setDraftImages] = useState<DraftImageListState>(initialDraftImages);
  const [reviewingImageIdentifier, setReviewingImageIdentifier] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadDraftImagesPage = useCallback((page: number) => {
    setDraftImages((state) => ({
      ...state,
      isInitialLoading: page === 1,
      isLoadingMore: page > 1,
      loadError: null,
    }));

    void adapter.listDraftImages({
      fallbackErrorMessage: messages.draftImageListLoadFailed,
      page,
      perPage: defaultWikiImagePerPage,
      status: "under_review",
    }).then((imagePage) => {
      setDraftImages((state) => ({
        ...state,
        images: page === 1 ? imagePage.images : [...state.images, ...imagePage.images],
        isInitialLoading: false,
        isLoadingMore: false,
        pageInfo: {
          current_page: imagePage.current_page,
          last_page: imagePage.last_page,
          total: imagePage.total,
        },
      }));
    }).catch((error: unknown) => {
      setDraftImages((state) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError:
          error instanceof Error ? error.message : messages.draftImageListLoadFailed,
      }));
    });
  }, [adapter, messages.draftImageListLoadFailed]);

  const removeReviewedImage = (imageIdentifier: string) => {
    setDraftImages((state) => ({
      ...state,
      images: state.images.filter((image) => image.imageIdentifier !== imageIdentifier),
      pageInfo: state.pageInfo
        ? {
            ...state.pageInfo,
            total: Math.max(0, state.pageInfo.total - 1),
          }
        : state.pageInfo,
    }));
  };

  const reviewDraftImage = (
    imageIdentifier: string,
    action: "approve" | "reject",
  ) => {
    setReviewingImageIdentifier(imageIdentifier);
    setReviewError(null);

    const fallbackErrorMessage =
      action === "approve"
        ? messages.draftImageApproveFailed
        : messages.draftImageRejectFailed;
    const request = action === "approve"
      ? adapter.approveDraftImage({ imageIdentifier, fallbackErrorMessage })
      : adapter.rejectDraftImage({ imageIdentifier, fallbackErrorMessage });

    void request.then(() => {
      removeReviewedImage(imageIdentifier);
    }).catch((error: unknown) => {
      setReviewError(
        error instanceof Error
          ? error.message
          : action === "approve"
            ? messages.draftImageApproveFailed
            : messages.draftImageRejectFailed,
      );
    }).finally(() => {
      setReviewingImageIdentifier(null);
    });
  };

  return {
    draftImages,
    loadDraftImagesPage,
    reviewDraftImage,
    reviewError,
    reviewingImageIdentifier,
  };
};

"use client";

import { useCallback, useState } from "react";

import {
  defaultWikiImagePerPage,
  type WikiDraftImage,
  type WikiDraftImageListResponse,
} from "../wiki/wikiImageModel";
import type { MyPageDraftImageAdapter } from "./myPageAdapters";

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

  const loadDraftImagesPage = useCallback(async (page: number) => {
    setDraftImages((state) => ({
      ...state,
      isInitialLoading: page === 1,
      isLoadingMore: page > 1,
      loadError: null,
    }));

    try {
      const imagePage = await adapter.listDraftImages({
        fallbackErrorMessage: messages.draftImageListLoadFailed,
        page,
        perPage: defaultWikiImagePerPage,
        status: "under_review",
      });

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
    } catch (error) {
      setDraftImages((state) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError:
          error instanceof Error ? error.message : messages.draftImageListLoadFailed,
      }));
    }
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

  const reviewDraftImage = async (
    imageIdentifier: string,
    action: "approve" | "reject",
  ) => {
    setReviewingImageIdentifier(imageIdentifier);
    setReviewError(null);

    try {
      const fallbackErrorMessage =
        action === "approve"
          ? messages.draftImageApproveFailed
          : messages.draftImageRejectFailed;

      if (action === "approve") {
        await adapter.approveDraftImage({ imageIdentifier, fallbackErrorMessage });
      } else {
        await adapter.rejectDraftImage({ imageIdentifier, fallbackErrorMessage });
      }

      removeReviewedImage(imageIdentifier);
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : action === "approve"
            ? messages.draftImageApproveFailed
            : messages.draftImageRejectFailed,
      );
    } finally {
      setReviewingImageIdentifier(null);
    }
  };

  return {
    draftImages,
    loadDraftImagesPage,
    reviewDraftImage,
    reviewError,
    reviewingImageIdentifier,
  };
};

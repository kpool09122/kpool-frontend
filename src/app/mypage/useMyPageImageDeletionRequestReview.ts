"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  createWikiImageDeletionRequestReview,
  defaultWikiImagePerPage,
  type WikiImageDeletionRequestListItem,
  type WikiImageDeletionRequestListResponse,
} from "@kpool/wiki";
import type { MyPageDraftImageAdapter } from "@/gateways/mypage/myPageAdapters";
import { myPageQueryKeys } from "./queryKeys";

export type ImageDeletionRequestListState = {
  images: WikiImageDeletionRequestListItem[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiImageDeletionRequestListResponse, "current_page" | "last_page" | "total"> | null;
};

type MyPageImageDeletionRequestReviewMessages = {
  imageDeletionRequestApproveFailed: string;
  imageDeletionRequestListLoadFailed: string;
  imageDeletionRequestRejectFailed: string;
};

export const initialImageDeletionRequestListState: ImageDeletionRequestListState = {
  images: [],
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
};

export const useMyPageImageDeletionRequestReview = ({
  adapter,
  identityIdentifier,
  initialImageDeletionRequests,
  messages,
}: {
  adapter: MyPageDraftImageAdapter;
  identityIdentifier: string | null;
  initialImageDeletionRequests: ImageDeletionRequestListState;
  messages: MyPageImageDeletionRequestReviewMessages;
}) => {
  const queryClient = useQueryClient();
  const listQueryKey = myPageQueryKeys.imageDeletionRequests.list({
    identityIdentifier,
  });
  const { data: cachedImageDeletionRequests = initialImageDeletionRequests } = useQuery({
    enabled: false,
    initialData: initialImageDeletionRequests,
    queryFn: async () => toImageDeletionRequestListState(await adapter.listImageDeletionRequests({
      fallbackErrorMessage: messages.imageDeletionRequestListLoadFailed,
      page: 1,
      perPage: defaultWikiImagePerPage,
    })),
    queryKey: listQueryKey,
  });
  const [reviewingImageIdentifier, setReviewingImageIdentifier] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadImageDeletionRequestsPage = useCallback((page: number) => {
    queryClient.setQueryData<ImageDeletionRequestListState>(listQueryKey, (state = initialImageDeletionRequestListState) => ({
      ...state,
      isInitialLoading: page === 1,
      isLoadingMore: page > 1,
      loadError: null,
    }));

    void queryClient.fetchQuery({
      queryKey: myPageQueryKeys.imageDeletionRequests.page({
        identityIdentifier,
        page,
      }),
      queryFn: () => adapter.listImageDeletionRequests({
        fallbackErrorMessage: messages.imageDeletionRequestListLoadFailed,
        page,
        perPage: defaultWikiImagePerPage,
      }),
    }).then((imagePage) => {
      queryClient.setQueryData<ImageDeletionRequestListState>(listQueryKey, (state = initialImageDeletionRequestListState) => ({
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
      queryClient.setQueryData<ImageDeletionRequestListState>(listQueryKey, (state = initialImageDeletionRequestListState) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError:
          error instanceof Error ? error.message : messages.imageDeletionRequestListLoadFailed,
      }));
    });
  }, [adapter, identityIdentifier, listQueryKey, messages.imageDeletionRequestListLoadFailed, queryClient]);

  const removeReviewedImage = useCallback((imageIdentifier: string) => {
    queryClient.setQueryData<ImageDeletionRequestListState>(listQueryKey, (state = initialImageDeletionRequestListState) => ({
      ...state,
      images: state.images.filter((image) => image.imageIdentifier !== imageIdentifier),
      pageInfo: state.pageInfo
        ? {
            ...state.pageInfo,
            total: Math.max(0, state.pageInfo.total - 1),
          }
        : state.pageInfo,
    }));
  }, [listQueryKey, queryClient]);

  const reviewMutation = useMutation({
    mutationFn: ({
      action,
      imageIdentifier,
      reviewerComment,
    }: {
      action: "approve" | "reject";
      imageIdentifier: string;
      reviewerComment: string;
    }) => {
      const fallbackErrorMessage =
        action === "approve"
          ? messages.imageDeletionRequestApproveFailed
          : messages.imageDeletionRequestRejectFailed;
      const requestBody = createWikiImageDeletionRequestReview({ reviewerComment });

      return action === "approve"
        ? adapter.approveImageDeletionRequest({ imageIdentifier, fallbackErrorMessage, requestBody })
        : adapter.rejectImageDeletionRequest({ imageIdentifier, fallbackErrorMessage, requestBody });
    },
    onMutate: ({ imageIdentifier }) => {
      setReviewingImageIdentifier(imageIdentifier);
      setReviewError(null);
    },
    onSuccess: (_data, { imageIdentifier }) => {
      removeReviewedImage(imageIdentifier);
    },
    onError: (error, { action }) => {
      setReviewError(
        error instanceof Error
          ? error.message
          : action === "approve"
            ? messages.imageDeletionRequestApproveFailed
            : messages.imageDeletionRequestRejectFailed,
      );
    },
    onSettled: () => {
      setReviewingImageIdentifier(null);
    },
  });

  const reviewImageDeletionRequest = (
    imageIdentifier: string,
    action: "approve" | "reject",
    reviewerComment: string,
  ) => {
    reviewMutation.mutate({ imageIdentifier, action, reviewerComment });
  };

  return {
    imageDeletionRequests: cachedImageDeletionRequests,
    loadImageDeletionRequestsPage,
    reviewError,
    reviewImageDeletionRequest,
    reviewingImageIdentifier,
  };
};

const toImageDeletionRequestListState = (
  imagePage: WikiImageDeletionRequestListResponse,
): ImageDeletionRequestListState => ({
  images: imagePage.images,
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: {
    current_page: imagePage.current_page,
    last_page: imagePage.last_page,
    total: imagePage.total,
  },
});

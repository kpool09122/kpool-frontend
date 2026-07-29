"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  createWikiImageDeletionRequestRejection,
  defaultWikiImagePerPage,
  type WikiImageDeletionRequestListResponse,
} from "@kpool/wiki";
import type { AdminDraftImageAdapter } from "@/gateways/admin/adminAdapters";
import { adminQueryKeys } from "../../queryKeys";
import {
  initialImageDeletionRequestListState,
  type ImageDeletionRequestListState,
} from "../../useAdminImageDeletionRequestReview";

type ImageDeletionRequestMessages = {
  imageDeletionRequestApproveFailed: string;
  imageDeletionRequestListLoadFailed: string;
  imageDeletionRequestRejectFailed: string;
};

type ImageDeletionRequestsParams = {
  adapter: AdminDraftImageAdapter;
  identityIdentifier: string | null;
  initialImageDeletionRequests: ImageDeletionRequestListState;
  messages: ImageDeletionRequestMessages;
};

const shouldLoadInitialImageDeletionRequestPage = (
  state: ImageDeletionRequestListState,
): boolean =>
  !state.pageInfo && state.images.length === 0 && !state.isInitialLoading;

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

const getImageDeletionRequestQueryState = ({
  error,
  fallbackErrorMessage,
  initialImageDeletionRequests,
  isFetching,
  state,
}: {
  error: unknown;
  fallbackErrorMessage: string;
  initialImageDeletionRequests: ImageDeletionRequestListState;
  isFetching: boolean;
  state: ImageDeletionRequestListState | undefined;
}): ImageDeletionRequestListState => {
  if (state) {
    return state;
  }

  if (isFetching) {
    return {
      ...initialImageDeletionRequests,
      isInitialLoading: true,
      loadError: null,
    };
  }

  if (error) {
    return {
      ...initialImageDeletionRequests,
      isInitialLoading: false,
      loadError: error instanceof Error ? error.message : fallbackErrorMessage,
    };
  }

  return initialImageDeletionRequests;
};

export const useImageDeletionRequests = ({
  adapter,
  identityIdentifier,
  initialImageDeletionRequests,
  messages,
}: ImageDeletionRequestsParams) => {
  const queryClient = useQueryClient();
  const listQueryKey = adminQueryKeys.imageDeletionRequests.list({
    identityIdentifier,
  });
  const hasInitialImageDeletionRequestPage = !shouldLoadInitialImageDeletionRequestPage(initialImageDeletionRequests);
  const fetchImageDeletionRequestsPage = useCallback((page: number) =>
    adapter.listImageDeletionRequests({
      fallbackErrorMessage: messages.imageDeletionRequestListLoadFailed,
      page,
      perPage: defaultWikiImagePerPage,
    }), [adapter, messages.imageDeletionRequestListLoadFailed]);
  const imageDeletionRequestsQuery = useQuery({
    enabled: !hasInitialImageDeletionRequestPage,
    initialData: hasInitialImageDeletionRequestPage ? initialImageDeletionRequests : undefined,
    queryFn: async () => toImageDeletionRequestListState(await fetchImageDeletionRequestsPage(1)),
    queryKey: listQueryKey,
    retry: false,
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
      queryKey: adminQueryKeys.imageDeletionRequests.page({
        identityIdentifier,
        page,
      }),
      queryFn: () => fetchImageDeletionRequestsPage(page),
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
  }, [fetchImageDeletionRequestsPage, identityIdentifier, listQueryKey, messages.imageDeletionRequestListLoadFailed, queryClient]);

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
    mutationFn: (
      input:
        | { action: "approve"; imageIdentifier: string }
        | { action: "reject"; imageIdentifier: string; rejectReason: string },
    ) => {
      const { action, imageIdentifier } = input;
      const fallbackErrorMessage =
        action === "approve"
          ? messages.imageDeletionRequestApproveFailed
          : messages.imageDeletionRequestRejectFailed;

      return action === "approve"
        ? adapter.approveImageDeletionRequest({ imageIdentifier, fallbackErrorMessage })
        : adapter.rejectImageDeletionRequest({
            imageIdentifier,
            fallbackErrorMessage,
            requestBody: createWikiImageDeletionRequestRejection({ rejectReason: input.rejectReason }),
          });
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
    rejectReason?: string,
  ) => {
    if (action === "approve") {
      reviewMutation.mutate({ imageIdentifier, action });
      return;
    }

    reviewMutation.mutate({ imageIdentifier, action, rejectReason: rejectReason ?? "" });
  };

  return {
    imageDeletionRequests: getImageDeletionRequestQueryState({
      error: imageDeletionRequestsQuery.error,
      fallbackErrorMessage: messages.imageDeletionRequestListLoadFailed,
      initialImageDeletionRequests,
      isFetching: imageDeletionRequestsQuery.isFetching,
      state: imageDeletionRequestsQuery.data,
    }),
    loadImageDeletionRequestsPage,
    reviewError,
    reviewImageDeletionRequest,
    reviewingImageIdentifier,
  };
};

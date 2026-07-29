"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  defaultWikiImagePerPage,
  type WikiDraftImageListResponse,
} from "@kpool/wiki";
import type { AdminDraftImageAdapter } from "@/gateways/admin/adminAdapters";
import { adminQueryKeys } from "../../queryKeys";
import {
  initialDraftImageListState,
  type DraftImageListState,
} from "../../useAdminDraftImageReview";

type DraftImageMessages = {
  draftImageApproveFailed: string;
  draftImageListLoadFailed: string;
  draftImageRejectFailed: string;
};

type DraftImagesParams = {
  adapter: AdminDraftImageAdapter;
  identityIdentifier: string | null;
  initialDraftImages: DraftImageListState;
  messages: DraftImageMessages;
};

const draftImageListQuery = {
  status: "under_review" as const,
};

const shouldLoadInitialDraftImagePage = (state: DraftImageListState): boolean =>
  !state.pageInfo && state.images.length === 0 && !state.isInitialLoading;

const toDraftImageListState = (imagePage: WikiDraftImageListResponse): DraftImageListState => ({
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

const getDraftImageQueryState = ({
  error,
  fallbackErrorMessage,
  initialDraftImages,
  isFetching,
  state,
}: {
  error: unknown;
  fallbackErrorMessage: string;
  initialDraftImages: DraftImageListState;
  isFetching: boolean;
  state: DraftImageListState | undefined;
}): DraftImageListState => {
  if (state) {
    return state;
  }

  if (isFetching) {
    return {
      ...initialDraftImages,
      isInitialLoading: true,
      loadError: null,
    };
  }

  if (error) {
    return {
      ...initialDraftImages,
      isInitialLoading: false,
      loadError: error instanceof Error ? error.message : fallbackErrorMessage,
    };
  }

  return initialDraftImages;
};

export const useDraftImages = ({
  adapter,
  identityIdentifier,
  initialDraftImages,
  messages,
}: DraftImagesParams) => {
  const queryClient = useQueryClient();
  const listQueryKey = adminQueryKeys.draftImages.list({
    ...draftImageListQuery,
    identityIdentifier,
  });
  const hasInitialDraftImagePage = !shouldLoadInitialDraftImagePage(initialDraftImages);
  const fetchDraftImagesPage = useCallback((page: number) =>
    adapter.listDraftImages({
      fallbackErrorMessage: messages.draftImageListLoadFailed,
      page,
      perPage: defaultWikiImagePerPage,
      status: draftImageListQuery.status,
    }), [adapter, messages.draftImageListLoadFailed]);
  const draftImagesQuery = useQuery({
    enabled: !hasInitialDraftImagePage,
    initialData: hasInitialDraftImagePage ? initialDraftImages : undefined,
    queryFn: async () => toDraftImageListState(await fetchDraftImagesPage(1)),
    queryKey: listQueryKey,
    retry: false,
  });
  const [reviewingImageIdentifier, setReviewingImageIdentifier] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadDraftImagesPage = useCallback((page: number) => {
    queryClient.setQueryData<DraftImageListState>(listQueryKey, (state = initialDraftImageListState) => ({
      ...state,
      isInitialLoading: page === 1,
      isLoadingMore: page > 1,
      loadError: null,
    }));

    void queryClient.fetchQuery({
      queryKey: adminQueryKeys.draftImages.page({
        ...draftImageListQuery,
        identityIdentifier,
        page,
      }),
      queryFn: () => fetchDraftImagesPage(page),
    }).then((imagePage) => {
      queryClient.setQueryData<DraftImageListState>(listQueryKey, (state = initialDraftImageListState) => ({
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
      queryClient.setQueryData<DraftImageListState>(listQueryKey, (state = initialDraftImageListState) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError:
          error instanceof Error ? error.message : messages.draftImageListLoadFailed,
      }));
    });
  }, [fetchDraftImagesPage, identityIdentifier, listQueryKey, messages.draftImageListLoadFailed, queryClient]);

  const removeReviewedImage = useCallback((imageIdentifier: string) => {
    queryClient.setQueryData<DraftImageListState>(listQueryKey, (state = initialDraftImageListState) => ({
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
    }: {
      action: "approve" | "reject";
      imageIdentifier: string;
    }) => {
      const fallbackErrorMessage =
        action === "approve"
          ? messages.draftImageApproveFailed
          : messages.draftImageRejectFailed;

      return action === "approve"
        ? adapter.approveDraftImage({ imageIdentifier, fallbackErrorMessage })
        : adapter.rejectDraftImage({ imageIdentifier, fallbackErrorMessage });
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
            ? messages.draftImageApproveFailed
            : messages.draftImageRejectFailed,
      );
    },
    onSettled: () => {
      setReviewingImageIdentifier(null);
    },
  });

  const reviewDraftImage = (
    imageIdentifier: string,
    action: "approve" | "reject",
  ) => {
    reviewMutation.mutate({ imageIdentifier, action });
  };

  return {
    draftImages: getDraftImageQueryState({
      error: draftImagesQuery.error,
      fallbackErrorMessage: messages.draftImageListLoadFailed,
      initialDraftImages,
      isFetching: draftImagesQuery.isFetching,
      state: draftImagesQuery.data,
    }),
    loadDraftImagesPage,
    reviewDraftImage,
    reviewError,
    reviewingImageIdentifier,
  };
};

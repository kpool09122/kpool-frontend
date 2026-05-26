"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  defaultWikiImagePerPage,
  type WikiDraftImage,
  type WikiDraftImageListResponse,
} from "@kpool/wiki";
import type { MyPageDraftImageAdapter } from "@/gateways/mypage/myPageAdapters";
import { myPageQueryKeys } from "./queryKeys";

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

const draftImageListQuery = {
  status: "under_review" as const,
};

export const useMyPageDraftImageReview = ({
  adapter,
  identityIdentifier,
  initialDraftImages,
  messages,
}: {
  adapter: MyPageDraftImageAdapter;
  identityIdentifier: string | null;
  initialDraftImages: DraftImageListState;
  messages: MyPageDraftImageReviewMessages;
}) => {
  const queryClient = useQueryClient();
  const listQueryKey = myPageQueryKeys.draftImages.list({
    ...draftImageListQuery,
    identityIdentifier,
  });
  const { data: cachedDraftImages = initialDraftImages } = useQuery({
    enabled: false,
    initialData: initialDraftImages,
    queryFn: async () => toDraftImageListState(await adapter.listDraftImages({
      fallbackErrorMessage: messages.draftImageListLoadFailed,
      page: 1,
      perPage: defaultWikiImagePerPage,
      status: draftImageListQuery.status,
    })),
    queryKey: listQueryKey,
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
      queryKey: myPageQueryKeys.draftImages.page({
        ...draftImageListQuery,
        identityIdentifier,
        page,
      }),
      queryFn: () => adapter.listDraftImages({
        fallbackErrorMessage: messages.draftImageListLoadFailed,
        page,
        perPage: defaultWikiImagePerPage,
        status: draftImageListQuery.status,
      }),
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
  }, [adapter, identityIdentifier, listQueryKey, messages.draftImageListLoadFailed, queryClient]);

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
    draftImages: cachedDraftImages,
    loadDraftImagesPage,
    reviewDraftImage,
    reviewError,
    reviewingImageIdentifier,
  };
};

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

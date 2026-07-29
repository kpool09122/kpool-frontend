import {
  type WikiImageDeletionRequestListItem,
  type WikiImageDeletionRequestListResponse,
} from "@kpool/wiki";

export type ImageDeletionRequestListState = {
  images: WikiImageDeletionRequestListItem[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiImageDeletionRequestListResponse, "current_page" | "last_page" | "total"> | null;
};

export const initialImageDeletionRequestListState: ImageDeletionRequestListState = {
  images: [],
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
};

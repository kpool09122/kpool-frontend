import {
  type WikiDraftImage,
  type WikiDraftImageListResponse,
} from "@kpool/wiki";

export type DraftImageListState = {
  images: WikiDraftImage[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiDraftImageListResponse, "next_cursor" | "total"> | null;
};

export const initialDraftImageListState: DraftImageListState = {
  images: [],
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
};

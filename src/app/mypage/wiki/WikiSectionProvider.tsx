"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { WikiDraftWorkflowAction } from "@/gateways/wiki/draftWiki";
import type { DraftImageListState } from "../useMyPageDraftImageReview";
import type { ImageDeletionRequestListState } from "../useMyPageImageDeletionRequestReview";
import type {
  DraftWikiListState,
  MyPageDraftWikiActionTab,
  MyPageWikiListItem,
} from "../useMyPageDraftWikis";
import type { MyPageWikiTab } from "../myPageTypes";

export type WikiSectionContextValue = {
  activeWikiTab: MyPageWikiTab;
  deletingWikiIdentifier: string | null;
  draftImages: DraftImageListState;
  draftWikiReviewError: string | null;
  draftWikis: Record<MyPageDraftWikiActionTab, DraftWikiListState>;
  imageDeletionRequestReviewError: string | null;
  imageDeletionRequests: ImageDeletionRequestListState;
  reviewError: string | null;
  reviewingImageDeletionRequestIdentifier: string | null;
  reviewingImageIdentifier: string | null;
  reviewingWikiIdentifier: string | null;
  onDeleteDraftWiki: (wiki: MyPageWikiListItem) => void;
  onLoadDraftImagesPage: (page: number) => void;
  onLoadDraftWikisPage: (tab: MyPageDraftWikiActionTab, page: number) => void;
  onLoadImageDeletionRequestsPage: (page: number) => void;
  onReviewDraftImage: (imageIdentifier: string, action: "approve" | "reject") => void;
  onReviewDraftWiki: (wiki: MyPageWikiListItem, action: WikiDraftWorkflowAction) => void;
  onReviewImageDeletionRequest: (imageIdentifier: string, action: "approve" | "reject", rejectReason?: string) => void;
  onWithdrawDraftWiki: (wiki: MyPageWikiListItem) => void;
};

const WikiSectionContext = createContext<WikiSectionContextValue | null>(null);

export function WikiSectionProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WikiSectionContextValue;
}) {
  return (
    <WikiSectionContext.Provider value={value}>
      {children}
    </WikiSectionContext.Provider>
  );
}

export const useWikiSection = () => {
  return useContext(WikiSectionContext) as WikiSectionContextValue;
};

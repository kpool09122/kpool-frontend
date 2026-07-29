"use client";

import type {
  WikiDraftWiki,
  WikiDraftWikiListResponse,
  WikiVersionInconsistentWiki,
} from "@/gateways/wiki/draftWiki";

export type MyPageDraftWikiTab = "editingWikis" | "submittedWikis" | "unapprovedWikis";
export type MyPageDraftWikiActionTab = MyPageDraftWikiTab | "approvedWikis" | "untranslatedWikis";
export type MyPageWikiListItem = WikiDraftWiki | WikiVersionInconsistentWiki;

export type DraftWikiListState = {
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiDraftWikiListResponse, "current_page" | "last_page" | "total"> | null;
  wikis: MyPageWikiListItem[];
};

export const initialDraftWikiListState: DraftWikiListState = {
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
  wikis: [],
};

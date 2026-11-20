"use client";

import type {
  WikiDraftWiki,
  DraftWikiListPageInfo,
  WikiVersionInconsistentWiki,
} from "@/gateways/wiki/draftWiki";

export type AdminDraftWikiTab = "editingWikis" | "submittedWikis" | "unapprovedWikis";
export type AdminDraftWikiActionTab = AdminDraftWikiTab | "approvedWikis" | "untranslatedWikis";
export type AdminWikiListItem = WikiDraftWiki | WikiVersionInconsistentWiki;

export type DraftWikiListState = {
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  pageInfo: DraftWikiListPageInfo | null;
  wikis: AdminWikiListItem[];
};

export const initialDraftWikiListState: DraftWikiListState = {
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
  wikis: [],
};

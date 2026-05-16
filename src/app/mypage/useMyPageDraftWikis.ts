"use client";

import { useCallback, useState } from "react";

import {
  defaultWikiDraftPerPage,
  type WikiDraftWiki,
  type WikiDraftWikiListResponse,
  type WikiDraftWikiStatus,
} from "../wiki/draftWiki";
import type { MyPageDraftWikiAdapter } from "./myPageAdapters";

export type MyPageDraftWikiTab = "editingWikis" | "submittedWikis" | "unapprovedWikis";

export type DraftWikiListState = {
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiDraftWikiListResponse, "current_page" | "last_page" | "total"> | null;
  wikis: WikiDraftWiki[];
};

type DraftWikiListConfig = {
  onlyMine?: boolean;
  status: WikiDraftWikiStatus;
};

type MyPageDraftWikiMessages = {
  draftWikiListLoadFailed: string;
};

export const initialDraftWikiListState: DraftWikiListState = {
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
  wikis: [],
};

export const draftWikiListConfigByTab = {
  editingWikis: {
    onlyMine: true,
    status: "pending",
  },
  submittedWikis: {
    onlyMine: true,
    status: "under_review",
  },
  unapprovedWikis: {
    status: "under_review",
  },
} as const satisfies Record<MyPageDraftWikiTab, DraftWikiListConfig>;

export const useMyPageDraftWikis = ({
  adapter,
  initialDraftWikis,
  messages,
}: {
  adapter: MyPageDraftWikiAdapter;
  initialDraftWikis: Record<MyPageDraftWikiTab, DraftWikiListState>;
  messages: MyPageDraftWikiMessages;
}) => {
  const [draftWikis, setDraftWikis] =
    useState<Record<MyPageDraftWikiTab, DraftWikiListState>>(initialDraftWikis);

  const loadDraftWikisPage = useCallback(async (tab: MyPageDraftWikiTab, page: number) => {
    setDraftWikis((state) => ({
      ...state,
      [tab]: {
        ...state[tab],
        isInitialLoading: page === 1,
        isLoadingMore: page > 1,
        loadError: null,
      },
    }));

    try {
      const wikiPage = await adapter.listDraftWikis({
        ...draftWikiListConfigByTab[tab],
        fallbackErrorMessage: messages.draftWikiListLoadFailed,
        page,
        perPage: defaultWikiDraftPerPage,
      });

      setDraftWikis((state) => ({
        ...state,
        [tab]: {
          ...state[tab],
          isInitialLoading: false,
          isLoadingMore: false,
          pageInfo: {
            current_page: wikiPage.current_page,
            last_page: wikiPage.last_page,
            total: wikiPage.total,
          },
          wikis: page === 1 ? wikiPage.wikis : [...state[tab].wikis, ...wikiPage.wikis],
        },
      }));
    } catch (error) {
      setDraftWikis((state) => ({
        ...state,
        [tab]: {
          ...state[tab],
          isInitialLoading: false,
          isLoadingMore: false,
          loadError:
            error instanceof Error ? error.message : messages.draftWikiListLoadFailed,
        },
      }));
    }
  }, [adapter, messages.draftWikiListLoadFailed]);

  return {
    draftWikis,
    loadDraftWikisPage,
  };
};

"use client";

import { useCallback, useState } from "react";

import {
  createReviewWikiRequestBody,
  defaultWikiDraftPerPage,
  type WikiDraftWiki,
  type WikiDraftWikiListResponse,
  type WikiDraftReviewAction,
  type WikiDraftWikiStatus,
} from "@/gateways/wiki/draftWiki";
import type { MyPageDraftWikiAdapter } from "@/gateways/mypage/myPageAdapters";

export type MyPageDraftWikiTab = "editingWikis" | "submittedWikis" | "unapprovedWikis";
export type MyPageDraftWikiActionTab = MyPageDraftWikiTab | "approvedWikis";

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
  draftWikiApproveFailed: string;
  draftWikiListLoadFailed: string;
  draftWikiPublishFailed: string;
  draftWikiRejectFailed: string;
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
  approvedWikis: {
    status: "approved",
  },
} as const satisfies Record<MyPageDraftWikiActionTab, DraftWikiListConfig>;

export const useMyPageDraftWikis = ({
  adapter,
  initialDraftWikis,
  messages,
}: {
  adapter: MyPageDraftWikiAdapter;
  initialDraftWikis: Record<MyPageDraftWikiActionTab, DraftWikiListState>;
  messages: MyPageDraftWikiMessages;
}) => {
  const [draftWikis, setDraftWikis] =
    useState<Record<MyPageDraftWikiActionTab, DraftWikiListState>>(initialDraftWikis);
  const [reviewingWikiIdentifier, setReviewingWikiIdentifier] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadDraftWikisPage = useCallback((tab: MyPageDraftWikiActionTab, page: number) => {
    setDraftWikis((state) => ({
      ...state,
      [tab]: {
        ...state[tab],
        isInitialLoading: page === 1,
        isLoadingMore: page > 1,
        loadError: null,
      },
    }));

    void adapter.listDraftWikis({
      ...draftWikiListConfigByTab[tab],
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      page,
      perPage: defaultWikiDraftPerPage,
    }).then((wikiPage) => {
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
    }).catch((error: unknown) => {
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
    });
  }, [adapter, messages.draftWikiListLoadFailed]);

  const removeWikiFromTab = (tab: MyPageDraftWikiActionTab, wikiIdentifier: string) => {
    setDraftWikis((state) => ({
      ...state,
      [tab]: {
        ...state[tab],
        pageInfo: state[tab].pageInfo
          ? {
              ...state[tab].pageInfo,
              total: Math.max(0, state[tab].pageInfo.total - 1),
            }
          : state[tab].pageInfo,
        wikis: state[tab].wikis.filter(
          (wiki) => wiki.wikiIdentifier !== wikiIdentifier,
        ),
      },
    }));
  };

  const reviewDraftWiki = (
    wiki: WikiDraftWiki,
    action: WikiDraftReviewAction | "publish",
  ) => {
    setReviewingWikiIdentifier(wiki.wikiIdentifier);
    setReviewError(null);

    const fallbackErrorMessage =
      action === "approve"
        ? messages.draftWikiApproveFailed
        : action === "publish"
          ? messages.draftWikiPublishFailed
          : messages.draftWikiRejectFailed;
    const requestBody = createReviewWikiRequestBody(wiki);
    const request = action === "approve"
      ? adapter.approveDraftWiki({
          fallbackErrorMessage,
          requestBody,
          wikiId: wiki.wikiIdentifier,
        })
      : action === "publish"
        ? adapter.publishDraftWiki({
            fallbackErrorMessage,
            requestBody,
            wikiId: wiki.wikiIdentifier,
          })
        : adapter.rejectDraftWiki({
            fallbackErrorMessage,
            requestBody,
            wikiId: wiki.wikiIdentifier,
          });

    void request.then(() => {
      removeWikiFromTab(
        action === "publish" ? "approvedWikis" : "unapprovedWikis",
        wiki.wikiIdentifier,
      );
    }).catch((error: unknown) => {
      setReviewError(
        error instanceof Error
          ? error.message
          : action === "approve"
            ? messages.draftWikiApproveFailed
            : action === "publish"
              ? messages.draftWikiPublishFailed
              : messages.draftWikiRejectFailed,
      );
    }).finally(() => {
      setReviewingWikiIdentifier(null);
    });
  };

  return {
    draftWikis,
    loadDraftWikisPage,
    reviewDraftWiki,
    reviewError,
    reviewingWikiIdentifier,
  };
};

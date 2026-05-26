"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { myPageQueryKeys } from "./queryKeys";

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
  identityIdentifier,
  initialDraftWikis,
  messages,
}: {
  adapter: MyPageDraftWikiAdapter;
  identityIdentifier: string | null;
  initialDraftWikis: Record<MyPageDraftWikiActionTab, DraftWikiListState>;
  messages: MyPageDraftWikiMessages;
}) => {
  const queryClient = useQueryClient();
  const wikiQueries = {
    approvedWikis: useQuery({
      enabled: false,
      initialData: initialDraftWikis.approvedWikis,
      queryFn: async () => toDraftWikiListState(await adapter.listDraftWikis({
        ...draftWikiListConfigByTab.approvedWikis,
        fallbackErrorMessage: messages.draftWikiListLoadFailed,
        page: 1,
        perPage: defaultWikiDraftPerPage,
      })),
      queryKey: myPageQueryKeys.draftWikis.list({
        ...draftWikiListConfigByTab.approvedWikis,
        identityIdentifier,
        tab: "approvedWikis",
      }),
    }),
    editingWikis: useQuery({
      enabled: false,
      initialData: initialDraftWikis.editingWikis,
      queryFn: async () => toDraftWikiListState(await adapter.listDraftWikis({
        ...draftWikiListConfigByTab.editingWikis,
        fallbackErrorMessage: messages.draftWikiListLoadFailed,
        page: 1,
        perPage: defaultWikiDraftPerPage,
      })),
      queryKey: myPageQueryKeys.draftWikis.list({
        ...draftWikiListConfigByTab.editingWikis,
        identityIdentifier,
        tab: "editingWikis",
      }),
    }),
    submittedWikis: useQuery({
      enabled: false,
      initialData: initialDraftWikis.submittedWikis,
      queryFn: async () => toDraftWikiListState(await adapter.listDraftWikis({
        ...draftWikiListConfigByTab.submittedWikis,
        fallbackErrorMessage: messages.draftWikiListLoadFailed,
        page: 1,
        perPage: defaultWikiDraftPerPage,
      })),
      queryKey: myPageQueryKeys.draftWikis.list({
        ...draftWikiListConfigByTab.submittedWikis,
        identityIdentifier,
        tab: "submittedWikis",
      }),
    }),
    unapprovedWikis: useQuery({
      enabled: false,
      initialData: initialDraftWikis.unapprovedWikis,
      queryFn: async () => toDraftWikiListState(await adapter.listDraftWikis({
        ...draftWikiListConfigByTab.unapprovedWikis,
        fallbackErrorMessage: messages.draftWikiListLoadFailed,
        page: 1,
        perPage: defaultWikiDraftPerPage,
      })),
      queryKey: myPageQueryKeys.draftWikis.list({
        ...draftWikiListConfigByTab.unapprovedWikis,
        identityIdentifier,
        tab: "unapprovedWikis",
      }),
    }),
  };
  const [reviewingWikiIdentifier, setReviewingWikiIdentifier] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadDraftWikisPage = useCallback((tab: MyPageDraftWikiActionTab, page: number) => {
    const listQueryKey = myPageQueryKeys.draftWikis.list({
      ...draftWikiListConfigByTab[tab],
      identityIdentifier,
      tab,
    });

    queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
      ...state,
        isInitialLoading: page === 1,
        isLoadingMore: page > 1,
        loadError: null,
    }));

    void queryClient.fetchQuery({
      queryKey: myPageQueryKeys.draftWikis.page({
        ...draftWikiListConfigByTab[tab],
        identityIdentifier,
        page,
        tab,
      }),
      queryFn: () => adapter.listDraftWikis({
        ...draftWikiListConfigByTab[tab],
        fallbackErrorMessage: messages.draftWikiListLoadFailed,
        page,
        perPage: defaultWikiDraftPerPage,
      }),
    }).then((wikiPage) => {
      queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
        ...state,
          isInitialLoading: false,
          isLoadingMore: false,
          pageInfo: {
            current_page: wikiPage.current_page,
            last_page: wikiPage.last_page,
            total: wikiPage.total,
          },
          wikis: page === 1 ? wikiPage.wikis : [...state.wikis, ...wikiPage.wikis],
      }));
    }).catch((error: unknown) => {
      queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
        ...state,
          isInitialLoading: false,
          isLoadingMore: false,
          loadError:
            error instanceof Error ? error.message : messages.draftWikiListLoadFailed,
      }));
    });
  }, [adapter, identityIdentifier, messages.draftWikiListLoadFailed, queryClient]);

  const removeWikiFromTab = useCallback((tab: MyPageDraftWikiActionTab, wikiIdentifier: string) => {
    const listQueryKey = myPageQueryKeys.draftWikis.list({
      ...draftWikiListConfigByTab[tab],
      identityIdentifier,
      tab,
    });

    queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
      ...state,
      pageInfo: state.pageInfo
        ? {
            ...state.pageInfo,
            total: Math.max(0, state.pageInfo.total - 1),
          }
        : state.pageInfo,
      wikis: state.wikis.filter(
        (wiki) => wiki.wikiIdentifier !== wikiIdentifier,
      ),
    }));
  }, [identityIdentifier, queryClient]);

  const reviewMutation = useMutation<
    unknown,
    Error,
    { action: WikiDraftReviewAction | "publish"; wiki: WikiDraftWiki }
  >({
    mutationFn: ({
      action,
      wiki,
    }: {
      action: WikiDraftReviewAction | "publish";
      wiki: WikiDraftWiki;
    }) => {
      const fallbackErrorMessage =
        action === "approve"
          ? messages.draftWikiApproveFailed
          : action === "publish"
            ? messages.draftWikiPublishFailed
            : messages.draftWikiRejectFailed;
      const requestBody = createReviewWikiRequestBody(wiki);

      return action === "approve"
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
    },
    onMutate: ({ wiki }) => {
      setReviewingWikiIdentifier(wiki.wikiIdentifier);
      setReviewError(null);
    },
    onSuccess: (_data, { action, wiki }) => {
      removeWikiFromTab(
        action === "publish" ? "approvedWikis" : "unapprovedWikis",
        wiki.wikiIdentifier,
      );
    },
    onError: (error, { action }) => {
      setReviewError(
        error instanceof Error
          ? error.message
          : action === "approve"
            ? messages.draftWikiApproveFailed
            : action === "publish"
              ? messages.draftWikiPublishFailed
              : messages.draftWikiRejectFailed,
      );
    },
    onSettled: () => {
      setReviewingWikiIdentifier(null);
    },
  });

  const draftWikis = {
    approvedWikis: wikiQueries.approvedWikis.data ?? initialDraftWikis.approvedWikis,
    editingWikis: wikiQueries.editingWikis.data ?? initialDraftWikis.editingWikis,
    submittedWikis: wikiQueries.submittedWikis.data ?? initialDraftWikis.submittedWikis,
    unapprovedWikis: wikiQueries.unapprovedWikis.data ?? initialDraftWikis.unapprovedWikis,
  };

  const reviewDraftWiki = (
    wiki: WikiDraftWiki,
    action: WikiDraftReviewAction | "publish",
  ) => {
    reviewMutation.mutate({ wiki, action });
  };

  return {
    draftWikis,
    loadDraftWikisPage,
    reviewDraftWiki,
    reviewError,
    reviewingWikiIdentifier,
  };
};

const toDraftWikiListState = (wikiPage: WikiDraftWikiListResponse): DraftWikiListState => ({
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: {
    current_page: wikiPage.current_page,
    last_page: wikiPage.last_page,
    total: wikiPage.total,
  },
  wikis: wikiPage.wikis,
});

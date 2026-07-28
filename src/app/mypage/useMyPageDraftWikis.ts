"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  createDeleteWikiRequestBody,
  createRejectWikiRequestBody,
  createReviewWikiRequestBody,
  createTranslateWikiRequestBody,
  defaultWikiDraftPerPage,
  type WikiDraftWiki,
  type WikiDraftWikiListResponse,
  type WikiDraftWikiStatus,
  type WikiDraftWorkflowAction,
  type WikiVersionInconsistentWiki,
  type WikiVersionInconsistentWikiListResponse,
} from "@/gateways/wiki/draftWiki";
import type { MyPageDraftWikiAdapter } from "@/gateways/mypage/myPageAdapters";
import { myPageQueryKeys } from "./queryKeys";

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

type DraftWikiListScope = "managed" | "my";

type DraftWikiListConfig = {
  scope: DraftWikiListScope;
  statuses: WikiDraftWikiStatus[];
};

type MyPageDraftWikiMessages = {
  draftWikiApproveFailed: string;
  draftWikiDeleteFailed: string;
  draftWikiListLoadFailed: string;
  draftWikiPublishFailed: string;
  draftWikiRejectFailed: string;
  draftWikiTranslateFailed: string;
  draftWikiWithdrawFailed: string;
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
    scope: "my",
    statuses: ["pending", "rejected"],
  },
  submittedWikis: {
    scope: "my",
    statuses: ["under_review"],
  },
  unapprovedWikis: {
    scope: "managed",
    statuses: ["under_review"],
  },
  approvedWikis: {
    scope: "managed",
    statuses: ["approved"],
  },
} as const satisfies Record<Exclude<MyPageDraftWikiActionTab, "untranslatedWikis">, DraftWikiListConfig>;

const isDraftWikiListTab = (
  tab: MyPageDraftWikiActionTab,
): tab is Exclude<MyPageDraftWikiActionTab, "untranslatedWikis"> =>
  tab !== "untranslatedWikis";

const listQueryKeyForTab = ({
  identityIdentifier,
  tab,
}: {
  identityIdentifier: string | null;
  tab: MyPageDraftWikiActionTab;
}) => myPageQueryKeys.draftWikis.list({
  ...(isDraftWikiListTab(tab) ? draftWikiListConfigByTab[tab] : {}),
  identityIdentifier,
  tab,
});

const fetchDraftWikiPage = ({
  adapter,
  messages,
  page,
  tab,
}: {
  adapter: MyPageDraftWikiAdapter;
  messages: MyPageDraftWikiMessages;
  page: number;
  tab: MyPageDraftWikiActionTab;
}): Promise<WikiDraftWikiListResponse | WikiVersionInconsistentWikiListResponse> => {
  if (!isDraftWikiListTab(tab)) {
    return adapter.listUntranslatedWikis({
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      order: "desc",
      page,
      perPage: defaultWikiDraftPerPage,
      sort: "updatedAt",
    });
  }

  const config = draftWikiListConfigByTab[tab];
  const listDraftWikis = config.scope === "my"
    ? adapter.listMyDraftWikis
    : adapter.listManagedDraftWikis;

  return listDraftWikis({
    fallbackErrorMessage: messages.draftWikiListLoadFailed,
    page,
    perPage: defaultWikiDraftPerPage,
    statuses: config.statuses,
  });
};

const shouldLoadInitialDraftWikiPage = (state: DraftWikiListState): boolean =>
  !state.pageInfo && state.wikis.length === 0 && !state.isInitialLoading;

export const useMyPageDraftWikiList = ({
  adapter,
  identityIdentifier,
  initialDraftWiki,
  messages,
  tab,
}: {
  adapter: MyPageDraftWikiAdapter;
  identityIdentifier: string | null;
  initialDraftWiki: DraftWikiListState;
  messages: MyPageDraftWikiMessages;
  tab: MyPageDraftWikiActionTab;
}) => {
  const queryClient = useQueryClient();
  const listQueryKey = listQueryKeyForTab({ identityIdentifier, tab });
  const hasInitialDraftWikiPage = !shouldLoadInitialDraftWikiPage(initialDraftWiki);
  const draftWikiQuery = useQuery({
    enabled: !hasInitialDraftWikiPage,
    initialData: hasInitialDraftWikiPage ? initialDraftWiki : undefined,
    queryFn: async () => toDraftWikiListState(await fetchDraftWikiPage({
      adapter,
      messages,
      page: 1,
      tab,
    })),
    queryKey: listQueryKey,
    retry: false,
  });
  const [reviewingWikiIdentifier, setReviewingWikiIdentifier] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [deletingWikiIdentifier, setDeletingWikiIdentifier] = useState<string | null>(null);

  const loadDraftWikisPage = useCallback((page: number) => {
    queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
      ...state,
        isInitialLoading: page === 1,
        isLoadingMore: page > 1,
        loadError: null,
    }));

    void queryClient.fetchQuery<WikiDraftWikiListResponse | WikiVersionInconsistentWikiListResponse>({
      queryKey: myPageQueryKeys.draftWikis.page({
        ...(isDraftWikiListTab(tab) ? draftWikiListConfigByTab[tab] : {}),
        identityIdentifier,
        page,
        tab,
      }),
      queryFn: () => fetchDraftWikiPage({ adapter, messages, page, tab }),
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
  }, [adapter, identityIdentifier, listQueryKey, messages, queryClient, tab]);

  const removeWikiFromTab = useCallback((tab: MyPageDraftWikiActionTab, wikiIdentifier: string) => {
    const targetListQueryKey = listQueryKeyForTab({ identityIdentifier, tab });

    queryClient.setQueryData<DraftWikiListState>(targetListQueryKey, (state = initialDraftWikiListState) => ({
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
    { action: WikiDraftWorkflowAction; reason?: string; wiki: MyPageWikiListItem }
  >({
    mutationFn: ({
      action,
      reason,
      wiki,
    }: {
      action: WikiDraftWorkflowAction;
      reason?: string;
      wiki: MyPageWikiListItem;
    }) => {
      const fallbackErrorMessage =
        action === "approve"
          ? messages.draftWikiApproveFailed
          : action === "publish"
            ? messages.draftWikiPublishFailed
            : action === "translate"
              ? messages.draftWikiTranslateFailed
              : messages.draftWikiRejectFailed;
      if (action === "translate") {
        return adapter.translateDraftWiki({
          fallbackErrorMessage,
          requestBody: createTranslateWikiRequestBody(wiki),
          wikiId: wiki.wikiIdentifier,
        });
      }

      if (action === "reject") {
        return adapter.rejectDraftWiki({
          fallbackErrorMessage,
          requestBody: createRejectWikiRequestBody(wiki, reason ?? ""),
          wikiId: wiki.wikiIdentifier,
        });
      }

      const requestBody = createReviewWikiRequestBody(wiki);

      return action === "approve"
        ? adapter.approveDraftWiki({
            fallbackErrorMessage,
            requestBody,
            wikiId: wiki.wikiIdentifier,
          })
        : adapter.publishDraftWiki({
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
      if (action === "translate") {
        loadDraftWikisPage(1);
        return;
      }

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
              : action === "translate"
                ? messages.draftWikiTranslateFailed
                : messages.draftWikiRejectFailed,
      );
    },
    onSettled: () => {
      setReviewingWikiIdentifier(null);
    },
  });

  const deleteMutation = useMutation<void, Error, MyPageWikiListItem>({
    mutationFn: (wiki) =>
      adapter.deleteDraftWiki({
        fallbackErrorMessage: messages.draftWikiDeleteFailed,
        requestBody: createDeleteWikiRequestBody(wiki),
        wikiId: wiki.wikiIdentifier,
      }),
    onMutate: (wiki) => {
      setDeletingWikiIdentifier(wiki.wikiIdentifier);
      setReviewError(null);
    },
    onSuccess: (_data, wiki) => {
      removeWikiFromTab("editingWikis", wiki.wikiIdentifier);
    },
    onError: (error) => {
      setReviewError(
        error instanceof Error ? error.message : messages.draftWikiDeleteFailed,
      );
    },
    onSettled: () => {
      setDeletingWikiIdentifier(null);
    },
  });

  const withdrawMutation = useMutation<unknown, Error, MyPageWikiListItem>({
    mutationFn: (wiki) =>
      adapter.withdrawDraftWiki({
        fallbackErrorMessage: messages.draftWikiWithdrawFailed,
        wikiId: wiki.wikiIdentifier,
      }),
    onMutate: (wiki) => {
      setReviewingWikiIdentifier(wiki.wikiIdentifier);
      setReviewError(null);
    },
    onSuccess: (_data, wiki) => {
      removeWikiFromTab("submittedWikis", wiki.wikiIdentifier);
      queryClient.invalidateQueries({
        queryKey: myPageQueryKeys.draftWikis.list({
          ...draftWikiListConfigByTab.editingWikis,
          identityIdentifier,
          tab: "editingWikis",
        }),
      });
    },
    onError: (error) => {
      setReviewError(
        error instanceof Error ? error.message : messages.draftWikiWithdrawFailed,
      );
    },
    onSettled: () => {
      setReviewingWikiIdentifier(null);
    },
  });

  const reviewDraftWiki = (
    wiki: MyPageWikiListItem,
    action: WikiDraftWorkflowAction,
    reason?: string,
  ) => {
    reviewMutation.mutate({ wiki, action, reason });
  };

  const deleteDraftWiki = (wiki: MyPageWikiListItem) => {
    deleteMutation.mutate(wiki);
  };

  const withdrawDraftWiki = (wiki: MyPageWikiListItem) => {
    withdrawMutation.mutate(wiki);
  };

  return {
    deleteDraftWiki,
    deletingWikiIdentifier,
    draftWiki: getDraftWikiQueryState({
      error: draftWikiQuery.error,
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      initialDraftWiki,
      isFetching: draftWikiQuery.isFetching,
      state: draftWikiQuery.data,
    }),
    loadDraftWikisPage,
    reviewDraftWiki,
    reviewError,
    reviewingWikiIdentifier,
    withdrawDraftWiki,
  };
};

const getDraftWikiQueryState = ({
  error,
  fallbackErrorMessage,
  initialDraftWiki,
  isFetching,
  state,
}: {
  error: unknown;
  fallbackErrorMessage: string;
  initialDraftWiki: DraftWikiListState;
  isFetching: boolean;
  state: DraftWikiListState | undefined;
}): DraftWikiListState => {
  if (state) {
    return state;
  }

  if (isFetching) {
    return {
      ...initialDraftWiki,
      isInitialLoading: true,
      loadError: null,
    };
  }

  if (error) {
    return {
      ...initialDraftWiki,
      isInitialLoading: false,
      loadError: error instanceof Error ? error.message : fallbackErrorMessage,
    };
  }

  return initialDraftWiki;
};

type DraftWikiPageHookParams = Omit<
  Parameters<typeof useMyPageDraftWikiList>[0],
  "tab"
>;

export const useEditingDraftWikis = (params: DraftWikiPageHookParams) =>
  useMyPageDraftWikiList({ ...params, tab: "editingWikis" });

export const useSubmittedDraftWikis = (params: DraftWikiPageHookParams) =>
  useMyPageDraftWikiList({ ...params, tab: "submittedWikis" });

export const useUnapprovedDraftWikis = (params: DraftWikiPageHookParams) =>
  useMyPageDraftWikiList({ ...params, tab: "unapprovedWikis" });

export const useApprovedDraftWikis = (params: DraftWikiPageHookParams) =>
  useMyPageDraftWikiList({ ...params, tab: "approvedWikis" });

export const useUntranslatedWikis = (params: DraftWikiPageHookParams) =>
  useMyPageDraftWikiList({ ...params, tab: "untranslatedWikis" });

const toDraftWikiListState = (
  wikiPage: WikiDraftWikiListResponse | WikiVersionInconsistentWikiListResponse,
): DraftWikiListState => ({
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

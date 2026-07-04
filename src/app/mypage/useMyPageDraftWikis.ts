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
      queryFn: async () => toDraftWikiListState(await adapter.listManagedDraftWikis({
        statuses: draftWikiListConfigByTab.approvedWikis.statuses,
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
      queryFn: async () => toDraftWikiListState(await adapter.listMyDraftWikis({
        statuses: draftWikiListConfigByTab.editingWikis.statuses,
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
      queryFn: async () => toDraftWikiListState(await adapter.listMyDraftWikis({
        statuses: draftWikiListConfigByTab.submittedWikis.statuses,
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
      queryFn: async () => toDraftWikiListState(await adapter.listManagedDraftWikis({
        statuses: draftWikiListConfigByTab.unapprovedWikis.statuses,
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
    untranslatedWikis: useQuery({
      enabled: false,
      initialData: initialDraftWikis.untranslatedWikis,
      queryFn: async () => toDraftWikiListState(await adapter.listUntranslatedWikis({
        fallbackErrorMessage: messages.draftWikiListLoadFailed,
        order: "desc",
        page: 1,
        perPage: defaultWikiDraftPerPage,
        sort: "updatedAt",
      })),
      queryKey: myPageQueryKeys.draftWikis.list({
        identityIdentifier,
        tab: "untranslatedWikis",
      }),
    }),
  };
  const [reviewingWikiIdentifier, setReviewingWikiIdentifier] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [deletingWikiIdentifier, setDeletingWikiIdentifier] = useState<string | null>(null);

  const loadDraftWikisPage = useCallback((tab: MyPageDraftWikiActionTab, page: number) => {
    const listQueryKey = myPageQueryKeys.draftWikis.list({
      ...(isDraftWikiListTab(tab) ? draftWikiListConfigByTab[tab] : {}),
      identityIdentifier,
      tab,
    });

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
      queryFn: () => {
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
      },
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
      ...(isDraftWikiListTab(tab) ? draftWikiListConfigByTab[tab] : {}),
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
        loadDraftWikisPage("untranslatedWikis", 1);
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

  const draftWikis = {
    approvedWikis: wikiQueries.approvedWikis.data ?? initialDraftWikis.approvedWikis,
    editingWikis: wikiQueries.editingWikis.data ?? initialDraftWikis.editingWikis,
    submittedWikis: wikiQueries.submittedWikis.data ?? initialDraftWikis.submittedWikis,
    unapprovedWikis: wikiQueries.unapprovedWikis.data ?? initialDraftWikis.unapprovedWikis,
    untranslatedWikis: wikiQueries.untranslatedWikis.data ?? initialDraftWikis.untranslatedWikis,
  };

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
    draftWikis,
    loadDraftWikisPage,
    reviewDraftWiki,
    reviewError,
    reviewingWikiIdentifier,
    withdrawDraftWiki,
  };
};

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

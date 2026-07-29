import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  defaultWikiDraftPerPage,
  type WikiDraftWikiListResponse,
  type WikiVersionInconsistentWikiListResponse,
  
} from "@/gateways/wiki/draftWiki";
import type { MyPageDraftWikiAdapter } from "@/gateways/mypage/myPageAdapters";
import { myPageQueryKeys } from "../../queryKeys";
import {
  initialDraftWikiListState,
  type DraftWikiListState,
  type MyPageWikiListItem,
} from "../../useMyPageDraftWikis";

type DraftWikiMessages = {
  draftWikiListLoadFailed: string;
  draftWikiWithdrawFailed: string;
};

type SubmittedDraftWikisParams = {
  adapter: MyPageDraftWikiAdapter;
  identityIdentifier: string | null;
  initialDraftWiki: DraftWikiListState;
  messages: DraftWikiMessages;
};

const shouldLoadInitialDraftWikiPage = (state: DraftWikiListState): boolean =>
  !state.pageInfo && state.wikis.length === 0 && !state.isInitialLoading;

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
  if (state) return state;
  if (isFetching) return { ...initialDraftWiki, isInitialLoading: true, loadError: null };
  if (error) {
    return {
      ...initialDraftWiki,
      isInitialLoading: false,
      loadError: error instanceof Error ? error.message : fallbackErrorMessage,
    };
  }
  return initialDraftWiki;
};

export const useSubmittedDraftWikis = ({
  adapter,
  identityIdentifier,
  initialDraftWiki,
  messages,
}: SubmittedDraftWikisParams) => {
  const queryClient = useQueryClient();
  const listQueryKey = myPageQueryKeys.draftWikis.list({
    identityIdentifier,
    scope: "my",
    statuses: ["under_review"],
  });
  const hasInitialDraftWikiPage = !shouldLoadInitialDraftWikiPage(initialDraftWiki);
  const fetchPage = useCallback((page: number) =>
    adapter.listMyDraftWikis({
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      page,
      perPage: defaultWikiDraftPerPage,
      statuses: ["under_review"],
    }), [adapter, messages.draftWikiListLoadFailed]);
  const draftWikiQuery = useQuery({
    enabled: !hasInitialDraftWikiPage,
    initialData: hasInitialDraftWikiPage ? initialDraftWiki : undefined,
    queryFn: async () => toDraftWikiListState(await fetchPage(1)),
    queryKey: listQueryKey,
    retry: false,
  });
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewingWikiIdentifier, setReviewingWikiIdentifier] = useState<string | null>(null);

  const loadDraftWikisPage = useCallback((page: number) => {
    queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
      ...state,
      isInitialLoading: page === 1,
      isLoadingMore: page > 1,
      loadError: null,
    }));

    void queryClient.fetchQuery<WikiDraftWikiListResponse | WikiVersionInconsistentWikiListResponse>({
      queryKey: myPageQueryKeys.draftWikis.page({
        identityIdentifier,
        page,
    scope: "my",
    statuses: ["under_review"],
      }),
      queryFn: () => fetchPage(page),
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
        loadError: error instanceof Error ? error.message : messages.draftWikiListLoadFailed,
      }));
    });
  }, [fetchPage, identityIdentifier, listQueryKey, messages.draftWikiListLoadFailed, queryClient]);

  const removeWikiFromCurrentList = useCallback((wikiIdentifier: string) => {
    queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
      ...state,
      pageInfo: state.pageInfo
        ? { ...state.pageInfo, total: Math.max(0, state.pageInfo.total - 1) }
        : state.pageInfo,
      wikis: state.wikis.filter((wiki) => wiki.wikiIdentifier !== wikiIdentifier),
    }));
  }, [listQueryKey, queryClient]);

  const withdrawMutation = useMutation<unknown, Error, MyPageWikiListItem>({
    mutationFn: (wiki) => adapter.withdrawDraftWiki({
      fallbackErrorMessage: messages.draftWikiWithdrawFailed,
      wikiId: wiki.wikiIdentifier,
    }),
    onMutate: (wiki) => {
      setReviewingWikiIdentifier(wiki.wikiIdentifier);
      setReviewError(null);
    },
    onSuccess: (_data, wiki) => {
      removeWikiFromCurrentList(wiki.wikiIdentifier);
    },
    onError: (error) => {
      setReviewError(error instanceof Error ? error.message : messages.draftWikiWithdrawFailed);
    },
    onSettled: () => {
      setReviewingWikiIdentifier(null);
    },
  });

  const withdrawDraftWiki = (wiki: MyPageWikiListItem) => {
    withdrawMutation.mutate(wiki);
  };

  return {
    draftWiki: getDraftWikiQueryState({
      error: draftWikiQuery.error,
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      initialDraftWiki,
      isFetching: draftWikiQuery.isFetching,
      state: draftWikiQuery.data,
    }),
    loadDraftWikisPage,
    reviewError,
    reviewingWikiIdentifier,
    withdrawDraftWiki,
  };
};

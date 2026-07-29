import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  defaultWikiDraftPerPage,
  type WikiDraftWikiListResponse,
  type WikiVersionInconsistentWikiListResponse,
  createTranslateWikiRequestBody,
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
  draftWikiTranslateFailed: string;
};

type UntranslatedWikisParams = {
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

export const useUntranslatedWikis = ({
  adapter,
  identityIdentifier,
  initialDraftWiki,
  messages,
}: UntranslatedWikisParams) => {
  const queryClient = useQueryClient();
  const listQueryKey = myPageQueryKeys.draftWikis.list({
    identityIdentifier,
  });
  const hasInitialDraftWikiPage = !shouldLoadInitialDraftWikiPage(initialDraftWiki);
  const fetchPage = useCallback((page: number) =>
    adapter.listUntranslatedWikis({
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      page,
      perPage: defaultWikiDraftPerPage,
      order: "desc",
      sort: "updatedAt",
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

  const translateMutation = useMutation<unknown, Error, MyPageWikiListItem>({
    mutationFn: (wiki) => adapter.translateDraftWiki({
      fallbackErrorMessage: messages.draftWikiTranslateFailed,
      requestBody: createTranslateWikiRequestBody(wiki),
      wikiId: wiki.wikiIdentifier,
    }),
    onMutate: (wiki) => {
      setReviewingWikiIdentifier(wiki.wikiIdentifier);
      setReviewError(null);
    },
    onSuccess: () => {
      loadDraftWikisPage(1);
    },
    onError: (error) => {
      setReviewError(error instanceof Error ? error.message : messages.draftWikiTranslateFailed);
    },
    onSettled: () => {
      setReviewingWikiIdentifier(null);
    },
  });

  const translateWiki = (wiki: MyPageWikiListItem) => {
    translateMutation.mutate(wiki);
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
    translateWiki,
  };
};

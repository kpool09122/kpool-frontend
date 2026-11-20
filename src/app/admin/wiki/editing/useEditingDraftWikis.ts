import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  defaultWikiDraftPerPage,
  type WikiDraftWikiListResponse,
  createDeleteWikiRequestBody,
} from "@/gateways/wiki/draftWiki";
import type { AdminDraftWikiAdapter } from "@/gateways/admin/adminAdapters";
import { adminQueryKeys } from "../../queryKeys";
import {
  initialDraftWikiListState,
  type DraftWikiListState,
  type AdminWikiListItem,
} from "../../useAdminDraftWikis";

type DraftWikiMessages = {
  draftWikiListLoadFailed: string;
  draftWikiDeleteFailed: string;
};

type EditingDraftWikisParams = {
  adapter: AdminDraftWikiAdapter;
  identityIdentifier: string | null;
  initialDraftWiki: DraftWikiListState;
  messages: DraftWikiMessages;
};

const shouldLoadInitialDraftWikiPage = (state: DraftWikiListState): boolean =>
  !state.pageInfo && state.wikis.length === 0 && !state.isInitialLoading;

const toDraftWikiListState = (
  wikiPage: WikiDraftWikiListResponse,
): DraftWikiListState => ({
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: {
    next_cursor: wikiPage.next_cursor,
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

export const useEditingDraftWikis = ({
  adapter,
  identityIdentifier,
  initialDraftWiki,
  messages,
}: EditingDraftWikisParams) => {
  const queryClient = useQueryClient();
  const listQueryKey = adminQueryKeys.draftWikis.list({
    identityIdentifier,
    scope: "my",
    statuses: ["pending", "rejected"],
  });
  const hasInitialDraftWikiPage = !shouldLoadInitialDraftWikiPage(initialDraftWiki);
  const fetchPage = useCallback((cursor: string | null = null) =>
    adapter.listMyDraftWikis({
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      cursor,
      perPage: defaultWikiDraftPerPage,
      statuses: ["pending", "rejected"],
    }), [adapter, messages.draftWikiListLoadFailed]);
  const draftWikiQuery = useQuery({
    enabled: !hasInitialDraftWikiPage,
    initialData: hasInitialDraftWikiPage ? initialDraftWiki : undefined,
    queryFn: async () => toDraftWikiListState(await fetchPage(null)),
    queryKey: listQueryKey,
    retry: false,
  });
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [deletingWikiIdentifier, setDeletingWikiIdentifier] = useState<string | null>(null);

  const loadDraftWikis = useCallback((cursor: string | null = null) => {
    queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
      ...state,
      isInitialLoading: cursor === null,
      isLoadingMore: cursor !== null,
      loadError: null,
    }));

    void fetchPage(cursor).then((wikiPage) => {
      queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        pageInfo: {
          next_cursor: wikiPage.next_cursor,
          total: wikiPage.total,
        },
        wikis: cursor === null ? wikiPage.wikis : [...state.wikis, ...wikiPage.wikis],
      }));
    }).catch((error: unknown) => {
      queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError: error instanceof Error ? error.message : messages.draftWikiListLoadFailed,
      }));
    });
  }, [fetchPage, listQueryKey, messages.draftWikiListLoadFailed, queryClient]);

  const removeWikiFromCurrentList = useCallback((wikiIdentifier: string) => {
    queryClient.setQueryData<DraftWikiListState>(listQueryKey, (state = initialDraftWikiListState) => ({
      ...state,
      pageInfo: state.pageInfo
        ? { ...state.pageInfo, total: Math.max(0, state.pageInfo.total - 1) }
        : state.pageInfo,
      wikis: state.wikis.filter((wiki) => wiki.wikiIdentifier !== wikiIdentifier),
    }));
  }, [listQueryKey, queryClient]);

  const deleteMutation = useMutation<void, Error, AdminWikiListItem>({
    mutationFn: (wiki) => adapter.deleteDraftWiki({
      fallbackErrorMessage: messages.draftWikiDeleteFailed,
      requestBody: createDeleteWikiRequestBody(wiki),
      wikiId: wiki.wikiIdentifier,
    }),
    onMutate: (wiki) => {
      setDeletingWikiIdentifier(wiki.wikiIdentifier);
      setReviewError(null);
    },
    onSuccess: (_data, wiki) => {
      removeWikiFromCurrentList(wiki.wikiIdentifier);
    },
    onError: (error) => {
      setReviewError(error instanceof Error ? error.message : messages.draftWikiDeleteFailed);
    },
    onSettled: () => {
      setDeletingWikiIdentifier(null);
    },
  });

  const deleteDraftWiki = (wiki: AdminWikiListItem) => {
    deleteMutation.mutate(wiki);
  };

  return {
    deletingWikiIdentifier,
    draftWiki: getDraftWikiQueryState({
      error: draftWikiQuery.error,
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      initialDraftWiki,
      isFetching: draftWikiQuery.isFetching,
      state: draftWikiQuery.data,
    }),
    loadDraftWikis,
    reviewError,
    deleteDraftWiki,
  };
};

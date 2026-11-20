import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  createRejectWikiRequestBody,
  createReviewWikiRequestBody,
  defaultWikiDraftPerPage,
  type WikiDraftWikiListResponse,
} from "@/gateways/wiki/draftWiki";
import type { AdminDraftWikiAdapter } from "@/gateways/admin/adminAdapters";
import { adminQueryKeys } from "../../queryKeys";
import {
  initialDraftWikiListState,
  type DraftWikiListState,
  type AdminWikiListItem,
} from "../../useAdminDraftWikis";

type DraftWikiMessages = {
  draftWikiApproveFailed: string;
  draftWikiListLoadFailed: string;
  draftWikiRejectFailed: string;
};

type UnapprovedDraftWikisParams = {
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

export const useUnapprovedDraftWikis = ({
  adapter,
  identityIdentifier,
  initialDraftWiki,
  messages,
}: UnapprovedDraftWikisParams) => {
  const queryClient = useQueryClient();
  const listQueryKey = adminQueryKeys.draftWikis.list({
    identityIdentifier,
    scope: "managed",
    statuses: ["under_review"],
  });
  const hasInitialDraftWikiPage = !shouldLoadInitialDraftWikiPage(initialDraftWiki);
  const fetchPage = useCallback((cursor: string | null = null) =>
    adapter.listManagedDraftWikis({
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      cursor,
      perPage: defaultWikiDraftPerPage,
      statuses: ["under_review"],
    }), [adapter, messages.draftWikiListLoadFailed]);
  const draftWikiQuery = useQuery({
    enabled: !hasInitialDraftWikiPage,
    initialData: hasInitialDraftWikiPage ? initialDraftWiki : undefined,
    queryFn: async () => toDraftWikiListState(await fetchPage(null)),
    queryKey: listQueryKey,
    retry: false,
  });
  const [reviewingWikiIdentifier, setReviewingWikiIdentifier] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

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

  const approveMutation = useMutation<unknown, Error, AdminWikiListItem>({
    mutationFn: (wiki) => adapter.approveDraftWiki({
      fallbackErrorMessage: messages.draftWikiApproveFailed,
      requestBody: createReviewWikiRequestBody(wiki),
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
      setReviewError(error instanceof Error ? error.message : messages.draftWikiApproveFailed);
    },
    onSettled: () => {
      setReviewingWikiIdentifier(null);
    },
  });

  const rejectMutation = useMutation<unknown, Error, { reason: string; wiki: AdminWikiListItem }>({
    mutationFn: ({ reason, wiki }) => adapter.rejectDraftWiki({
      fallbackErrorMessage: messages.draftWikiRejectFailed,
      requestBody: createRejectWikiRequestBody(wiki, reason),
      wikiId: wiki.wikiIdentifier,
    }),
    onMutate: ({ wiki }) => {
      setReviewingWikiIdentifier(wiki.wikiIdentifier);
      setReviewError(null);
    },
    onSuccess: (_data, { wiki }) => {
      removeWikiFromCurrentList(wiki.wikiIdentifier);
    },
    onError: (error) => {
      setReviewError(error instanceof Error ? error.message : messages.draftWikiRejectFailed);
    },
    onSettled: () => {
      setReviewingWikiIdentifier(null);
    },
  });

  const approveDraftWiki = (wiki: AdminWikiListItem) => {
    approveMutation.mutate(wiki);
  };

  const rejectDraftWiki = (wiki: AdminWikiListItem, reason: string) => {
    rejectMutation.mutate({ wiki, reason });
  };

  return {
    approveDraftWiki,
    draftWiki: getDraftWikiQueryState({
      error: draftWikiQuery.error,
      fallbackErrorMessage: messages.draftWikiListLoadFailed,
      initialDraftWiki,
      isFetching: draftWikiQuery.isFetching,
      state: draftWikiQuery.data,
    }),
    loadDraftWikis,
    rejectDraftWiki,
    reviewError,
    reviewingWikiIdentifier,
  };
};

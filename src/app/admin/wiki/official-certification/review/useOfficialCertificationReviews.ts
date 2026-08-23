"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import type { AdminOfficialCertificationAdapter } from "@/gateways/admin/adminAdapters";
import {
  createOfficialCertificationActionRequestBody,
  defaultOfficialCertificationPerPage,
  type OfficialCertificationAction,
  type OfficialCertificationListItem,
  type OfficialCertificationListResponse,
} from "@/gateways/wiki/officialCertification";
import { adminQueryKeys } from "../../../queryKeys";

type OfficialCertificationReviewMessages = {
  officialCertificationApproveFailed: string;
  officialCertificationListLoadFailed: string;
  officialCertificationRejectFailed: string;
};

type OfficialCertificationReviewsParams = {
  adapter: AdminOfficialCertificationAdapter;
  identityIdentifier: string | null;
  messages: OfficialCertificationReviewMessages;
};

export type OfficialCertificationReviewListState = {
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  officialCertifications: OfficialCertificationListItem[];
  pageInfo: {
    current_page: number;
    last_page: number;
    total: number;
  } | null;
};

const initialOfficialCertificationListState: OfficialCertificationReviewListState = {
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  officialCertifications: [],
  pageInfo: null,
};

const toOfficialCertificationListState = (
  response: OfficialCertificationListResponse,
): OfficialCertificationReviewListState => ({
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  officialCertifications: response.officialCertifications,
  pageInfo: {
    current_page: response.current_page,
    last_page: response.last_page,
    total: response.total,
  },
});

const getOfficialCertificationQueryState = ({
  error,
  fallbackErrorMessage,
  isFetching,
  state,
}: {
  error: unknown;
  fallbackErrorMessage: string;
  isFetching: boolean;
  state: OfficialCertificationReviewListState | undefined;
}): OfficialCertificationReviewListState => {
  if (state) {
    return state;
  }

  if (isFetching) {
    return {
      ...initialOfficialCertificationListState,
      isInitialLoading: true,
    };
  }

  if (error) {
    return {
      ...initialOfficialCertificationListState,
      loadError: error instanceof Error ? error.message : fallbackErrorMessage,
    };
  }

  return initialOfficialCertificationListState;
};

export const useOfficialCertificationReviews = ({
  adapter,
  identityIdentifier,
  messages,
}: OfficialCertificationReviewsParams) => {
  const queryClient = useQueryClient();
  const listQueryKey = adminQueryKeys.officialCertifications.list({
    identityIdentifier,
    status: "pending",
  });
  const fetchOfficialCertificationPage = useCallback((page: number) =>
    adapter.listOfficialCertifications({
      fallbackErrorMessage: messages.officialCertificationListLoadFailed,
      page,
      perPage: defaultOfficialCertificationPerPage,
      status: "pending",
    }), [adapter, messages.officialCertificationListLoadFailed]);
  const officialCertificationsQuery = useQuery({
    queryFn: async () => toOfficialCertificationListState(await fetchOfficialCertificationPage(1)),
    queryKey: listQueryKey,
    retry: false,
  });
  const [reviewingCertificationIdentifier, setReviewingCertificationIdentifier] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<OfficialCertificationAction | null>(null);

  const loadOfficialCertificationsPage = useCallback((page: number) => {
    queryClient.setQueryData<OfficialCertificationReviewListState>(listQueryKey, (state = initialOfficialCertificationListState) => ({
      ...state,
      isInitialLoading: page === 1,
      isLoadingMore: page > 1,
      loadError: null,
    }));

    void queryClient.fetchQuery({
      queryKey: adminQueryKeys.officialCertifications.page({
        identityIdentifier,
        page,
        status: "pending",
      }),
      queryFn: () => fetchOfficialCertificationPage(page),
    }).then((response) => {
      queryClient.setQueryData<OfficialCertificationReviewListState>(listQueryKey, (state = initialOfficialCertificationListState) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError: null,
        officialCertifications: page === 1
          ? response.officialCertifications
          : [...state.officialCertifications, ...response.officialCertifications],
        pageInfo: {
          current_page: response.current_page,
          last_page: response.last_page,
          total: response.total,
        },
      }));
    }).catch((error: unknown) => {
      queryClient.setQueryData<OfficialCertificationReviewListState>(listQueryKey, (state = initialOfficialCertificationListState) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError: error instanceof Error ? error.message : messages.officialCertificationListLoadFailed,
      }));
    });
  }, [fetchOfficialCertificationPage, identityIdentifier, listQueryKey, messages.officialCertificationListLoadFailed, queryClient]);

  const removeReviewedCertification = useCallback((certificationIdentifier: string) => {
    queryClient.setQueryData<OfficialCertificationReviewListState>(listQueryKey, (state = initialOfficialCertificationListState) => ({
      ...state,
      officialCertifications: state.officialCertifications.filter(
        (certification) => certification.certificationIdentifier !== certificationIdentifier,
      ),
      pageInfo: state.pageInfo
        ? {
            ...state.pageInfo,
            total: Math.max(0, state.pageInfo.total - 1),
          }
        : state.pageInfo,
    }));
  }, [listQueryKey, queryClient]);

  const reviewMutation = useMutation({
    mutationFn: ({ action, certificationIdentifier }: {
      action: OfficialCertificationAction;
      certificationIdentifier: string;
    }) => adapter.reviewOfficialCertification({
      action,
      fallbackErrorMessage: action === "approve"
        ? messages.officialCertificationApproveFailed
        : messages.officialCertificationRejectFailed,
      requestBody: createOfficialCertificationActionRequestBody(certificationIdentifier),
    }),
    onMutate: ({ certificationIdentifier }) => {
      setReviewingCertificationIdentifier(certificationIdentifier);
      setReviewError(null);
      setReviewSuccess(null);
    },
    onSuccess: (_summary, { action, certificationIdentifier }) => {
      removeReviewedCertification(certificationIdentifier);
      setReviewSuccess(action);
    },
    onError: (error, { action }) => {
      setReviewError(
        error instanceof Error
          ? error.message
          : action === "approve"
            ? messages.officialCertificationApproveFailed
            : messages.officialCertificationRejectFailed,
      );
    },
    onSettled: () => {
      setReviewingCertificationIdentifier(null);
    },
  });

  return {
    loadOfficialCertificationsPage,
    officialCertifications: getOfficialCertificationQueryState({
      error: officialCertificationsQuery.error,
      fallbackErrorMessage: messages.officialCertificationListLoadFailed,
      isFetching: officialCertificationsQuery.isFetching,
      state: officialCertificationsQuery.data,
    }),
    reviewError,
    reviewOfficialCertification: (certificationIdentifier: string, action: OfficialCertificationAction) => {
      reviewMutation.mutate({ action, certificationIdentifier });
    },
    reviewingCertificationIdentifier,
    reviewSuccess,
  };
};

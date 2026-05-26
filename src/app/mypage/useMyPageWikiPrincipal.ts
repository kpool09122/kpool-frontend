"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";

import type { AuthIdentityRefresh } from "@/gateways/auth/authStore";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import {
  getAccountIdentifierFromIdentity,
  type WikiPrincipalState,
} from "@/gateways/wiki/wikiPrincipal";
import type { MyPagePrincipalAdapter } from "@/gateways/mypage/myPageAdapters";
import { myPageQueryKeys } from "./queryKeys";

type MyPagePrincipalMessages = {
  accountUnavailableMessage: string;
  identityUnavailableMessage: string;
};

export const useMyPageWikiPrincipal = ({
  adapter,
  initialIdentity,
  initialPrincipalState,
  messages,
  onPrincipalReady,
  refreshIdentity,
}: {
  adapter: MyPagePrincipalAdapter;
  initialIdentity: IdentitySummary | null;
  initialPrincipalState: WikiPrincipalState;
  messages: MyPagePrincipalMessages;
  onPrincipalReady: () => unknown;
  refreshIdentity: AuthIdentityRefresh;
}) => {
  const queryClient = useQueryClient();
  const principalQueryKey = myPageQueryKeys.principal.current(
    initialIdentity?.identityIdentifier ?? null,
  );
  const { data: principalState = initialPrincipalState } = useQuery({
    enabled: false,
    initialData: initialPrincipalState,
    queryFn: () => adapter.getCurrentPrincipal(),
    queryKey: principalQueryKey,
  });

  const loadCurrentPrincipal = useCallback(async () => {
    queryClient.setQueryData<WikiPrincipalState>(principalQueryKey, { status: "loading" });
    const nextState = await queryClient.fetchQuery({
      queryKey: principalQueryKey,
      queryFn: () => adapter.getCurrentPrincipal(),
    });
    queryClient.setQueryData<WikiPrincipalState>(principalQueryKey, nextState);

    if (nextState.status === "available") {
      await onPrincipalReady();
    }
  }, [adapter, onPrincipalReady, principalQueryKey, queryClient]);

  const createPrincipalMutation = useMutation({
    mutationFn: async () => {
      let identity = initialIdentity;

      if (!identity) {
        identity = await refreshIdentity();
      }

      if (!identity) {
        return {
          status: "error",
          message: messages.identityUnavailableMessage,
        } as const;
      }

      let resolvedAccountIdentifier = getAccountIdentifierFromIdentity(identity);

      if (!resolvedAccountIdentifier) {
        const refreshedIdentity = await refreshIdentity();
        identity = refreshedIdentity ?? identity;
        resolvedAccountIdentifier = getAccountIdentifierFromIdentity(identity);
      }

      if (!resolvedAccountIdentifier) {
        return {
          status: "error",
          message: messages.accountUnavailableMessage,
        } as const;
      }

      return adapter.createPrincipal({
        identityIdentifier: identity.identityIdentifier,
        accountIdentifier: resolvedAccountIdentifier,
      });
    },
    onMutate: () => {
      queryClient.setQueryData<WikiPrincipalState>(principalQueryKey, { status: "loading" });
    },
    onSuccess: async (nextState) => {
      queryClient.setQueryData<WikiPrincipalState>(principalQueryKey, nextState);

      if (nextState.status === "available") {
        await onPrincipalReady();
      }
    },
  });

  const activateWikiPrincipal = async () => {
    await createPrincipalMutation.mutateAsync();
  };

  return {
    activateWikiPrincipal,
    loadCurrentPrincipal,
    principalState,
  };
};

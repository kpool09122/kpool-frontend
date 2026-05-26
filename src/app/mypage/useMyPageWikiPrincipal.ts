"use client";

import { useCallback, useState } from "react";

import type { AuthIdentityRefresh } from "@/gateways/auth/authStore";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import {
  getAccountIdentifierFromIdentity,
  type WikiPrincipalState,
} from "@/gateways/wiki/wikiPrincipal";
import type { MyPagePrincipalAdapter } from "@/gateways/mypage/myPageAdapters";

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
  const [principalState, setPrincipalState] =
    useState<WikiPrincipalState>(initialPrincipalState);

  const loadCurrentPrincipal = useCallback(async () => {
    setPrincipalState({ status: "loading" });
    const nextState = await adapter.getCurrentPrincipal();

    setPrincipalState(nextState);

    if (nextState.status === "available") {
      await onPrincipalReady();
    }
  }, [adapter, onPrincipalReady]);

  const activateWikiPrincipal = async () => {
    let identity = initialIdentity;

    if (!identity) {
      identity = await refreshIdentity();
    }

    if (!identity) {
      setPrincipalState({
        status: "error",
        message: messages.identityUnavailableMessage,
      });
      return;
    }

    let resolvedAccountIdentifier = getAccountIdentifierFromIdentity(identity);

    if (!resolvedAccountIdentifier) {
      const refreshedIdentity = await refreshIdentity();
      identity = refreshedIdentity ?? identity;
      resolvedAccountIdentifier = getAccountIdentifierFromIdentity(identity);
    }

    if (!resolvedAccountIdentifier) {
      setPrincipalState({
        status: "error",
        message: messages.accountUnavailableMessage,
      });
      return;
    }

    setPrincipalState({ status: "loading" });
    const nextState = await adapter.createPrincipal({
      identityIdentifier: identity.identityIdentifier,
      accountIdentifier: resolvedAccountIdentifier,
    });

    setPrincipalState(nextState);

    if (nextState.status === "available") {
      await onPrincipalReady();
    }
  };

  return {
    activateWikiPrincipal,
    loadCurrentPrincipal,
    principalState,
  };
};

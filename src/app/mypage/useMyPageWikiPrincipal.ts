"use client";

import { useCallback, useEffect, useState } from "react";

import type { IdentitySummary } from "../identityApi";
import {
  getAccountIdentifierFromIdentity,
  type WikiPrincipalState,
} from "../wiki/wikiPrincipal";
import type { MyPagePrincipalAdapter } from "./myPageAdapters";

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
}: {
  adapter: MyPagePrincipalAdapter;
  initialIdentity: IdentitySummary | null;
  initialPrincipalState: WikiPrincipalState;
  messages: MyPagePrincipalMessages;
  onPrincipalReady: () => Promise<void>;
}) => {
  const [principalState, setPrincipalState] =
    useState<WikiPrincipalState>(initialPrincipalState);
  const accountIdentifier = getAccountIdentifierFromIdentity(initialIdentity);

  const loadCurrentPrincipal = useCallback(async () => {
    setPrincipalState({ status: "loading" });
    const nextState = await adapter.getCurrentPrincipal();

    setPrincipalState(nextState);

    if (nextState.status === "available") {
      await onPrincipalReady();
    }
  }, [adapter, onPrincipalReady]);

  const activateWikiPrincipal = async () => {
    if (!initialIdentity) {
      setPrincipalState({
        status: "error",
        message: messages.identityUnavailableMessage,
      });
      return;
    }

    if (!accountIdentifier) {
      setPrincipalState({
        status: "error",
        message: messages.accountUnavailableMessage,
      });
      return;
    }

    setPrincipalState({ status: "loading" });
    const nextState = await adapter.createPrincipal({
      identityIdentifier: initialIdentity.identityIdentifier,
      accountIdentifier,
    });

    setPrincipalState(nextState);

    if (nextState.status === "available") {
      await onPrincipalReady();
    }
  };

  useEffect(() => {
    if (principalState.status === "idle") {
      const timeoutId = window.setTimeout(() => {
        void loadCurrentPrincipal();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [loadCurrentPrincipal, principalState.status]);

  return {
    accountIdentifier,
    activateWikiPrincipal,
    loadCurrentPrincipal,
    principalState,
  };
};

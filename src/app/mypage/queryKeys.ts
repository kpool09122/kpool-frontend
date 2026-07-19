import type { WikiDraftImageStatus } from "@kpool/wiki";

import type { MyPageDraftWikiActionTab } from "./useMyPageDraftWikis";
import type { WikiDraftWikiStatus } from "@/gateways/wiki/draftWiki";

type WikiDraftWikiListScope = "managed" | "my";

export const myPageQueryKeys = {
  all: ["mypage"] as const,
  draftImages: {
    all: () => [...myPageQueryKeys.all, "draftImages"] as const,
    list: ({
      identityIdentifier,
      status,
      wikiIdentifier,
    }: {
      identityIdentifier: string | null;
      status: WikiDraftImageStatus;
      wikiIdentifier?: string;
    }) => [
      ...myPageQueryKeys.draftImages.all(),
      "list",
      identityIdentifier ?? "guest",
      status,
      wikiIdentifier ?? null,
    ] as const,
    page: ({
      identityIdentifier,
      page,
      status,
      wikiIdentifier,
    }: {
      identityIdentifier: string | null;
      page: number;
      status: WikiDraftImageStatus;
      wikiIdentifier?: string;
    }) => [...myPageQueryKeys.draftImages.list({
      identityIdentifier,
      status,
      wikiIdentifier,
    }), page] as const,
  },
  imageDeletionRequests: {
    all: () => [...myPageQueryKeys.all, "imageDeletionRequests"] as const,
    list: ({
      identityIdentifier,
    }: {
      identityIdentifier: string | null;
    }) => [
      ...myPageQueryKeys.imageDeletionRequests.all(),
      "list",
      identityIdentifier ?? "guest",
    ] as const,
    page: ({
      identityIdentifier,
      page,
    }: {
      identityIdentifier: string | null;
      page: number;
    }) => [...myPageQueryKeys.imageDeletionRequests.list({ identityIdentifier }), page] as const,
  },
  draftWikis: {
    all: () => [...myPageQueryKeys.all, "draftWikis"] as const,
    list: ({
      identityIdentifier,
      scope,
      statuses,
      tab,
    }: {
      identityIdentifier: string | null;
      scope?: WikiDraftWikiListScope;
      statuses?: WikiDraftWikiStatus[];
      tab: MyPageDraftWikiActionTab;
    }) => [
      ...myPageQueryKeys.draftWikis.all(),
      "list",
      identityIdentifier ?? "guest",
      tab,
      statuses ?? null,
      scope ?? null,
    ] as const,
    page: ({
      identityIdentifier,
      page,
      scope,
      statuses,
      tab,
    }: {
      identityIdentifier: string | null;
      page: number;
      scope?: WikiDraftWikiListScope;
      statuses?: WikiDraftWikiStatus[];
      tab: MyPageDraftWikiActionTab;
    }) => [...myPageQueryKeys.draftWikis.list({
      identityIdentifier,
      scope,
      statuses,
      tab,
    }), page] as const,
  },
  principal: {
    current: (identityIdentifier: string | null) => [
      ...myPageQueryKeys.all,
      "wikiPrincipal",
      identityIdentifier ?? "guest",
      "current",
    ] as const,
  },
};

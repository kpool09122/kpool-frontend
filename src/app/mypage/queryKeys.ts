import type { WikiDraftImageStatus } from "@kpool/wiki";

import type { MyPageDraftWikiActionTab } from "./useMyPageDraftWikis";
import type { WikiDraftWikiStatus } from "@/gateways/wiki/draftWiki";

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
  draftWikis: {
    all: () => [...myPageQueryKeys.all, "draftWikis"] as const,
    list: ({
      identityIdentifier,
	      onlyMine,
	      status,
	      tab,
	    }: {
	      identityIdentifier: string | null;
	      onlyMine?: boolean;
	      status?: WikiDraftWikiStatus;
	      tab: MyPageDraftWikiActionTab;
	    }) => [
      ...myPageQueryKeys.draftWikis.all(),
      "list",
	      identityIdentifier ?? "guest",
	      tab,
	      status ?? null,
	      onlyMine ?? null,
	    ] as const,
    page: ({
      identityIdentifier,
	      onlyMine,
	      page,
	      status,
	      tab,
	    }: {
	      identityIdentifier: string | null;
	      onlyMine?: boolean;
	      page: number;
	      status?: WikiDraftWikiStatus;
	      tab: MyPageDraftWikiActionTab;
	    }) => [...myPageQueryKeys.draftWikis.list({
      identityIdentifier,
      onlyMine,
      status,
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

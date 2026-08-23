import type { WikiDraftImageStatus } from "@kpool/wiki";

import type { WikiDraftWikiStatus } from "@/gateways/wiki/draftWiki";

type WikiDraftWikiListScope = "managed" | "my";

export const adminQueryKeys = {
  all: ["admin"] as const,
  account: {
    all: () => [...adminQueryKeys.all, "account"] as const,
    profile: (accountIdentifier: string | null) => [
      ...adminQueryKeys.account.all(),
      "profile",
      accountIdentifier ?? "unavailable",
    ] as const,
    documents: (accountIdentifier: string | null) => [
      ...adminQueryKeys.account.all(),
      "documents",
      accountIdentifier ?? "unavailable",
    ] as const,
    principalGroups: () => [
      ...adminQueryKeys.account.all(),
      "principalGroups",
    ] as const,
    affiliations: ({
      status,
      viewerRole,
    }: {
      status: string;
      viewerRole?: "approver" | "requester";
    }) => [
      ...adminQueryKeys.account.all(),
      "affiliations",
      status,
      viewerRole ?? null,
    ] as const,
  },
  draftImages: {
    all: () => [...adminQueryKeys.all, "draftImages"] as const,
    list: ({
      identityIdentifier,
      status,
      wikiIdentifier,
    }: {
      identityIdentifier: string | null;
      status: WikiDraftImageStatus;
      wikiIdentifier?: string;
    }) => [
      ...adminQueryKeys.draftImages.all(),
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
    }) => [...adminQueryKeys.draftImages.list({
      identityIdentifier,
      status,
      wikiIdentifier,
    }), page] as const,
  },
  officialCertifications: {
    all: () => [...adminQueryKeys.all, "officialCertifications"] as const,
    list: ({
      identityIdentifier,
      status,
    }: {
      identityIdentifier: string | null;
      status: "pending";
    }) => [
      ...adminQueryKeys.officialCertifications.all(),
      "list",
      identityIdentifier ?? "guest",
      status,
    ] as const,
    page: ({
      identityIdentifier,
      page,
      status,
    }: {
      identityIdentifier: string | null;
      page: number;
      status: "pending";
    }) => [...adminQueryKeys.officialCertifications.list({
      identityIdentifier,
      status,
    }), page] as const,
  },
  imageDeletionRequests: {
    all: () => [...adminQueryKeys.all, "imageDeletionRequests"] as const,
    list: ({
      identityIdentifier,
    }: {
      identityIdentifier: string | null;
    }) => [
      ...adminQueryKeys.imageDeletionRequests.all(),
      "list",
      identityIdentifier ?? "guest",
    ] as const,
    page: ({
      identityIdentifier,
      page,
    }: {
      identityIdentifier: string | null;
      page: number;
    }) => [...adminQueryKeys.imageDeletionRequests.list({ identityIdentifier }), page] as const,
  },
  draftWikis: {
    all: () => [...adminQueryKeys.all, "draftWikis"] as const,
    list: ({
      identityIdentifier,
      scope,
      statuses,
    }: {
      identityIdentifier: string | null;
      scope?: WikiDraftWikiListScope;
      statuses?: WikiDraftWikiStatus[];
    }) => [
      ...adminQueryKeys.draftWikis.all(),
      "list",
      identityIdentifier ?? "guest",
      statuses ?? null,
      scope ?? null,
    ] as const,
    page: ({
      identityIdentifier,
      page,
      scope,
      statuses,
    }: {
      identityIdentifier: string | null;
      page: number;
      scope?: WikiDraftWikiListScope;
      statuses?: WikiDraftWikiStatus[];
    }) => [...adminQueryKeys.draftWikis.list({
      identityIdentifier,
      scope,
      statuses,
    }), page] as const,
  },
  principalGroupManagement: {
    current: (accountIdentifier: string | null) => [
      ...adminQueryKeys.all,
      "wikiPrincipalGroups",
      accountIdentifier ?? "unavailable",
    ] as const,
  },
  principal: {
    current: (identityIdentifier: string | null) => [
      ...adminQueryKeys.all,
      "wikiPrincipal",
      identityIdentifier ?? "guest",
      "current",
    ] as const,
  },
};

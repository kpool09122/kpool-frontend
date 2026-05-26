import { cookies } from "next/headers";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import {
  createWikiDraftWikisUrl,
  defaultWikiDraftPerPage,
  wikiDraftWikiListResponseSchema,
} from "@/gateways/wiki/draftWiki";
import { getCurrentWikiPrincipalForRequest } from "@/gateways/wiki/wikiPrincipal";
import { getWikiImageApiBaseUrl } from "@/gateways/wiki/wikiImageServerApi";
import { MyPageClient } from "./MyPageClient";

export const dynamic = "force-dynamic";

const isMockWikiGatewayEnabled = (): boolean =>
  process.env.KPOOL_ENABLE_MOCK_WIKI_GATEWAY === "1";

const createEmptyDraftWikiListState = () => ({
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
  wikis: [],
});

const createInitialDraftWikis = () => ({
  approvedWikis: createEmptyDraftWikiListState(),
  editingWikis: createEmptyDraftWikiListState(),
  submittedWikis: createEmptyDraftWikiListState(),
  unapprovedWikis: createEmptyDraftWikiListState(),
});

const createMockInitialDraftWikis = () => ({
  ...createInitialDraftWikis(),
  editingWikis: {
    isInitialLoading: false,
    isLoadingMore: false,
    loadError: null,
    pageInfo: {
      current_page: 1,
      last_page: 1,
      total: 1,
    },
    wikis: [{
      wikiIdentifier: "88888888-8888-8888-8888-888888888888",
      publishedWikiIdentifier: null,
      translationSetIdentifier: "99999999-9999-9999-9999-999999999999",
      slug: "gr-review-wiki",
      language: "ja",
      resourceType: "group",
      themeColor: "#4c5cff",
      status: "pending" as const,
      name: "編集中 Wiki",
      normalizedName: "editing-wiki",
      imageIdentifier: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      imageUrl: "https://images.example.test/editing-wiki.webp",
      imageAltText: "編集中 Wiki profile",
      editedAt: "2026-05-10T00:00:00Z",
      approvedAt: null,
      translatedAt: null,
      mergedAt: null,
    }],
  },
});

const loadInitialDraftWikis = async (cookieHeader: string) => {
  if (isMockWikiGatewayEnabled()) {
    return createMockInitialDraftWikis();
  }

  const baseUrl = getWikiImageApiBaseUrl();

  if (!baseUrl) {
    return createInitialDraftWikis();
  }

  try {
    const response = await fetch(
      createWikiDraftWikisUrl({
        baseUrl,
        onlyMine: true,
        page: 1,
        perPage: defaultWikiDraftPerPage,
        status: "pending",
      }),
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Cookie: cookieHeader,
        },
      },
    );

    if (!response.ok) {
      return createInitialDraftWikis();
    }

    const bodyResult = wikiDraftWikiListResponseSchema.safeParse(await response.json());

    if (!bodyResult.success) {
      return createInitialDraftWikis();
    }

    const body = bodyResult.data;

    return {
      ...createInitialDraftWikis(),
      editingWikis: {
        isInitialLoading: false,
        isLoadingMore: false,
        loadError: null,
        pageInfo: {
          current_page: body.current_page,
          last_page: body.last_page,
          total: body.total,
        },
        wikis: body.wikis,
      },
    };
  } catch {
    return createInitialDraftWikis();
  }
};

const getPrincipalStateKey = (
  principalState: Awaited<ReturnType<typeof getCurrentWikiPrincipalForRequest>> | { status: "idle" },
): string => {
  if (principalState.status === "available") {
    return `available:${principalState.principal.principalIdentifier}`;
  }

  return principalState.status;
};

export default async function MyPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const authenticatedIdentity = await fetchAuthenticatedIdentity({
    cookieHeader,
  });
  const principalState = authenticatedIdentity || isMockWikiGatewayEnabled()
    ? await getCurrentWikiPrincipalForRequest({ cookieHeader })
    : { status: "idle" as const };
  const initialDraftWikis = principalState.status === "available"
    ? await loadInitialDraftWikis(cookieHeader)
    : createInitialDraftWikis();

  return (
    <MyPageClient
      key={getPrincipalStateKey(principalState)}
      initialDraftWikis={initialDraftWikis}
      initialIdentity={authenticatedIdentity}
      initialPrincipalState={principalState}
    />
  );
}

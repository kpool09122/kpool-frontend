import type { WikiDraftWiki } from "./draftWiki";
import type { WikiPrincipalState, WikiPrincipalSummary } from "./wikiPrincipal";

export const mockWikiPrincipalCookieName = "kpool-e2e-wiki-principal";

export const isMockWikiGatewayEnabled = (): boolean =>
  process.env.KPOOL_ENABLE_MOCK_WIKI_GATEWAY === "1";

export const createMockEditingDraftWiki = (): WikiDraftWiki => ({
  wikiIdentifier: "88888888-8888-8888-8888-888888888888",
  publishedWikiIdentifier: null,
  translationSetIdentifier: "99999999-9999-9999-9999-999999999999",
  slug: "gr-review-wiki",
  language: "ja",
  resourceType: "group",
  themeColor: "#4c5cff",
  status: "pending",
  name: "編集中 Wiki",
  normalizedName: "editing-wiki",
  imageIdentifier: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  imageUrl: "https://images.example.test/editing-wiki.webp",
  imageAltText: "編集中 Wiki profile",
  editedAt: "2026-05-10T00:00:00Z",
  approvedAt: null,
  translatedAt: null,
  mergedAt: null,
});

const createEmptyMockDraftWikiListState = () => ({
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
  wikis: [],
});

export const createMockInitialDraftWikis = () => ({
  approvedWikis: createEmptyMockDraftWikiListState(),
  editingWikis: {
    isInitialLoading: false,
    isLoadingMore: false,
    loadError: null,
    pageInfo: {
      current_page: 1,
      last_page: 1,
      total: 1,
    },
    wikis: [createMockEditingDraftWiki()],
	  },
	  submittedWikis: createEmptyMockDraftWikiListState(),
	  unapprovedWikis: createEmptyMockDraftWikiListState(),
	  untranslatedWikis: createEmptyMockDraftWikiListState(),
	});

const getCookieValue = (cookieHeader: string | undefined, name: string): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
};

const mockPolicyIdentifiers: Record<string, string> = {
  BASIC_EDITING: "77777777-7777-7777-7777-777777777777",
  GROUP_MANAGEMENT: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  GROUP_PUBLISH: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  IMAGE_REVIEW: "66666666-6666-6666-6666-666666666666",
};

const createMockPolicy = (
  name: string,
  actions: string[],
  resourceTypes: string[],
): WikiPrincipalSummary["policies"][number] => ({
  policyIdentifier: mockPolicyIdentifiers[name] ?? "99999999-9999-9999-9999-999999999999",
  name,
  isSystemPolicy: true,
  statements: [{
    effect: "allow",
    actions,
    resourceTypes,
    condition: null,
  }],
});

const createMockPrincipal = (
  policies: WikiPrincipalSummary["policies"],
): WikiPrincipalSummary => ({
  principalIdentifier: "33333333-3333-3333-3333-333333333333",
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  isDelegatedPrincipal: false,
  isEnabled: true,
  policies,
});

const mockPrincipalStateByMode: Record<
  string,
  Extract<WikiPrincipalState, { status: "available" | "missing" }>
> = {
  missing: { status: "missing" },
  basic: {
    status: "available",
    principal: createMockPrincipal([
      createMockPolicy("BASIC_EDITING", ["CREATE", "EDIT", "SUBMIT"], ["WIKI"]),
    ]),
  },
  "wiki-review": {
    status: "available",
    principal: createMockPrincipal([
      createMockPolicy("GROUP_MANAGEMENT", ["APPROVE", "REJECT"], ["GROUP"]),
    ]),
  },
  "wiki-publish": {
    status: "available",
    principal: createMockPrincipal([
      createMockPolicy("GROUP_PUBLISH", ["PUBLISH"], ["GROUP"]),
    ]),
  },
  "image-review": {
    status: "available",
    principal: createMockPrincipal([
      createMockPolicy("IMAGE_REVIEW", ["APPROVE", "REJECT"], ["IMAGE"]),
    ]),
  },
};

export const getMockWikiPrincipalState = (
  cookieHeader: string | undefined,
): Extract<WikiPrincipalState, { status: "available" | "missing" }> | null => {
  if (!isMockWikiGatewayEnabled()) {
    return null;
  }

  const principalMode = getCookieValue(cookieHeader, mockWikiPrincipalCookieName);

  return principalMode ? mockPrincipalStateByMode[principalMode] ?? null : null;
};

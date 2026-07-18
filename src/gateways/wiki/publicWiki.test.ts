import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  adaptPublicWikiResponse,
  createPublicWikiApiClient,
  fetchPublicWikiList,
  fetchPublicWiki,
  getPublicWikiListEndpointPath,
  getPublicWikiEndpointPath,
  getPublicWikiErrorMessage,
  loadPublicWikiState,
} from "./publicWiki";

const publicWikiResponse = {
  basic: {
    agencyName: "North Harbor Entertainment",
    agencyIdentifier: "agency-wiki-1",
    agency: {
      wikiIdentifier: "agency-wiki-1",
      slug: "ag-north-harbor-entertainment",
      language: "ko",
      name: "North Harbor Entertainment",
      normalizedName: "north-harbor-entertainment",
    },
    debutDate: "2022-03-14",
    disbandDate: null,
    emoji: "☀",
    fandomName: "Daybreak",
    generation: "5th",
    groupType: "Girl Group",
    name: "Aurora Echo",
    normalizedName: "aurora-echo",
    officialColors: ["Solar Gold", "Midnight Blue"],
    representativeSymbol: "Solar wave",
    status: "Active",
    talents: [
      {
        wikiIdentifier: "talent-wiki-1",
        slug: "tl-momo",
        language: "ko",
        name: "MOMO",
        normalizedName: "momo",
      },
    ],
  },
  heroImage: {
    alt: "Aurora Echo public image",
    imageIdentifier: null,
    src: "https://cdn.example.com/aurora-echo.webp",
  },
  language: "ja",
  resourceType: "group",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: "Published overview from the backend.",
    },
  ],
  slug: "gr-aurora-echo",
  themeColor: "#4c5cff",
  fontStyle: "ja_mincho",
  title: "Aurora Echo SEO",
  metaDescription: "Aurora Echo public meta description.",
  keywords: ["aurora", "echo"],
  translationSetIdentifier: "translation-set-aurora-echo",
  version: 4,
  wikiIdentifier: "wiki-1",
};

const publicWikiListResponse = {
  current_page: 2,
  last_page: 4,
  per_page: 10,
  total: 31,
  wikis: [
    {
      language: "ja",
      name: "Aurora Echo",
      normalizedName: "aurora-echo",
      imageAltText: "Aurora Echo list image",
      imageIdentifier: "image-1",
      imageUrl: "https://cdn.example.com/aurora-echo-list.webp",
      publishedAt: "2026-05-01T00:00:00+00:00",
      resourceType: "group",
      slug: "gr-aurora-echo",
      themeColor: "#4c5cff",
      fontStyle: "ja_mincho",
      updatedAt: "2026-05-02T00:00:00+00:00",
      version: 4,
      wikiIdentifier: "wiki-1",
    },
  ],
};

describe("publicWiki", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes a public wiki response into the shared detail shape", () => {
    const wiki = adaptPublicWikiResponse(publicWikiResponse);

    expect(wiki).toMatchObject({
      basic: {
        agencyName: "North Harbor Entertainment",
        agencyIdentifier: "agency-wiki-1",
        agency: expect.objectContaining({
          name: "North Harbor Entertainment",
          slug: "ag-north-harbor-entertainment",
        }),
        name: "Aurora Echo",
        resourceType: "group",
        talents: [
          expect.objectContaining({
            name: "MOMO",
            wikiIdentifier: "talent-wiki-1",
          }),
        ],
        talentIdentifiers: ["talent-wiki-1"],
      },
      heroImage: {
        alt: "Aurora Echo public image",
        src: "https://cdn.example.com/aurora-echo.webp",
      },
      language: "ja",
      resourceType: "group",
      slug: "gr-aurora-echo",
      themeColor: "#4c5cff",
      fontStyle: "ja_mincho",
      title: "Aurora Echo SEO",
      metaDescription: "Aurora Echo public meta description.",
      keywords: ["aurora", "echo"],
      translationSetIdentifier: "translation-set-aurora-echo",
      version: 4,
    });
    expect(wiki.sections).toEqual([
      {
        type: "section",
        sectionIdentifier: "overview",
        title: "Overview",
        displayOrder: 1,
        depth: 1,
        contents: [
          {
            blockIdentifier: "overview-text-1",
            blockType: "text",
            displayOrder: 1,
            content: "Published overview from the backend.",
          },
        ],
      },
    ]);
  });

  it("keeps profile_card_list summaries from the public wiki response", () => {
    const wiki = adaptPublicWikiResponse({
      ...publicWikiResponse,
      sections: [
        {
          id: "members",
          title: "Members",
          contents: [
            {
              id: "members-profiles",
              type: "profile_card_list",
              displayOrder: 10,
              relatedResourceType: "talent",
              title: "Related profiles",
              wikiIdentifiers: ["11111111-1111-1111-1111-111111111111"],
              profiles: [
                {
                  wikiIdentifier: "11111111-1111-1111-1111-111111111111",
                  slug: "tl-momo",
                  language: "ko",
                  resourceType: "talent",
                  name: "MOMO",
                  normalizedName: "momo",
                  imageIdentifier: "99999999-9999-9999-9999-999999999999",
                  imageUrl: "https://upload.wikimedia.org/wikipedia/commons/example/momo.webp",
                  imageAltText: "MOMO public image",
                },
              ],
            },
          ],
        },
      ],
    });

    expect(wiki.sections[0].contents).toEqual([
      {
        blockIdentifier: "members-profiles",
        blockType: "profile_card_list",
        displayOrder: 10,
        profiles: [
          {
            wikiIdentifier: "11111111-1111-1111-1111-111111111111",
            slug: "tl-momo",
            language: "ko",
            resourceType: "talent",
            name: "MOMO",
            normalizedName: "momo",
            imageIdentifier: "99999999-9999-9999-9999-999999999999",
            imageUrl: "https://upload.wikimedia.org/wikipedia/commons/example/momo.webp",
            imageAltText: "MOMO public image",
          },
        ],
        relatedResourceType: "talent",
        title: "Related profiles",
        wikiIdentifiers: ["11111111-1111-1111-1111-111111111111"],
      },
    ]);
  });

  it("does not synthesize profile summaries when the API only returns identifiers", () => {
    const wiki = adaptPublicWikiResponse({
      ...publicWikiResponse,
      sections: [
        {
          id: "members",
          title: "Members",
          contents: [
            {
              id: "members-profiles",
              type: "profile_card_list",
              displayOrder: 10,
              title: "Related profiles",
              wikiIdentifiers: ["11111111-1111-1111-1111-111111111111"],
            },
          ],
        },
      ],
    });

    expect(wiki.sections[0].contents).toEqual([
      {
        blockIdentifier: "members-profiles",
        blockType: "profile_card_list",
        displayOrder: 10,
        profiles: [],
        relatedResourceType: null,
        title: "Related profiles",
        wikiIdentifiers: ["11111111-1111-1111-1111-111111111111"],
      },
    ]);
  });

  it("builds the public wiki endpoint from language, resource type, and slug", () => {
    expect(getPublicWikiEndpointPath("ja", "group", "gr-aurora echo")).toBe(
      "/wiki/ja/group/gr-aurora%20echo",
    );
  });

  it("builds the public wiki list endpoint with supported query parameters", () => {
    expect(
      getPublicWikiListEndpointPath("ja", {
        keyword: "aurora echo",
        order: "asc",
        page: 2,
        perPage: 30,
        resourceType: "group",
        sort: "name",
      }),
    ).toBe(
      "/wikis/ja?perPage=30&resourceType=group&keyword=aurora+echo&sort=name&order=asc&page=2",
    );
  });

  it("fetches the public wiki by inferred slug resource type", async () => {
    const client = {
      fetchWikiList: vi.fn(),
      fetchWiki: vi.fn().mockResolvedValue(publicWikiResponse),
    };

    await expect(fetchPublicWiki(client, "ja", "gr-aurora-echo")).resolves.toMatchObject({
      basic: {
        name: "Aurora Echo",
      },
      slug: "gr-aurora-echo",
    });
    expect(client.fetchWiki).toHaveBeenCalledWith("ja", "group", "gr-aurora-echo");
  });

  it("returns empty for unsupported public wiki slug prefixes", async () => {
    const client = {
      fetchWikiList: vi.fn(),
      fetchWiki: vi.fn(),
    };

    await expect(fetchPublicWiki(client, "ja", "aurora-echo")).resolves.toBeNull();
    expect(client.fetchWiki).not.toHaveBeenCalled();
  });

  it("creates a fetch client with the wiki api prefix", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(publicWikiResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createPublicWikiApiClient("http://127.0.0.1:8080");

    await expect(client?.fetchWiki("ja", "group", "gr-aurora-echo")).resolves.toEqual(
      publicWikiResponse,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/wiki/wiki/ja/group/gr-aurora-echo",
      expect.objectContaining({
        headers: {
          accept: "application/json",
        },
      }),
    );
  });

  it("fetches and adapts the public wiki list", async () => {
    const client = {
      fetchWiki: vi.fn(),
      fetchWikiList: vi.fn().mockResolvedValue(publicWikiListResponse),
    };

    await expect(
      fetchPublicWikiList(client, "ja", {
        order: "asc",
        page: 2,
        perPage: 10,
        sort: "name",
      }),
    ).resolves.toMatchObject({
      currentPage: 2,
      lastPage: 4,
      perPage: 10,
      total: 31,
      wikis: [
        {
          heroImage: {
            alt: "Aurora Echo list image",
            imageIdentifier: "image-1",
            src: "https://cdn.example.com/aurora-echo-list.webp",
          },
          name: "Aurora Echo",
          resourceType: "group",
          slug: "gr-aurora-echo",
        },
      ],
    });
    expect(client.fetchWikiList).toHaveBeenCalledWith("ja", {
      order: "asc",
      page: 2,
      perPage: 10,
      sort: "name",
    });
  });

  it("returns an error when the wiki api base url is not configured", async () => {
    expect(createPublicWikiApiClient("")).toBeNull();
    await expect(loadPublicWikiState("ja", "gr-twice")).resolves.toEqual({
      status: "error",
      message: "Wiki API is not configured.",
    });
  });

  it("turns api errors into a specific message", () => {
    expect(
      getPublicWikiErrorMessage({
        response: {
          status: 404,
        },
      }),
    ).toBe("Public wiki was not found.");

    expect(
      getPublicWikiErrorMessage({
        response: {
          data: {
            message: "published wiki failed",
          },
          status: 500,
        },
      }),
    ).toBe("published wiki failed");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  adaptDraftWikiResponse,
  approveWikiDraft,
  createDraftWikiApiClient,
  createReviewWikiRequestBody,
  createSubmitWikiRequestBody,
  createWikiDraftWikisUrl,
  fetchDraftWiki,
  fetchWikiDraftWikis,
  getDraftWikiEndpointPath,
  getDraftWikiAlias,
  getDraftWikiErrorMessage,
  getEditWikiEndpointPath,
  getPublishWikiEndpointPath,
  getReviewWikiEndpointPath,
  getSubmitWikiEndpointPath,
  loadDraftWikiState,
  publishDraftWiki,
  publishWikiDraft,
  saveDraftWiki,
  rejectWikiDraft,
  reviewDraftWiki,
  submitDraftWiki,
} from "./draftWiki";

describe("draftWiki", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps slug prefixes to the matching draft endpoint alias", () => {
    expect(getDraftWikiAlias("ag-jyp")).toBe("WikiOperations_getAgencyDraftWiki");
    expect(getDraftWikiAlias("gr-twice")).toBe("WikiOperations_getGroupDraftWiki");
    expect(getDraftWikiAlias("sg-cheer-up")).toBe("WikiOperations_getSongDraftWiki");
    expect(getDraftWikiAlias("tl-nayeon")).toBe("WikiOperations_getTalentDraftWiki");
    expect(getDraftWikiAlias("aurora-echo")).toBeNull();
  });

  it("normalizes a group draft response into the editor detail shape", () => {
    const wiki = adaptDraftWikiResponse({
      basic: {
        agencyName: "North Harbor Entertainment",
        debutDate: "2022-03-14",
        fandomName: "Daybreak",
        generation: "5th",
        groupType: "Girl Group",
        name: "Aurora Echo",
        normalizedName: "aurora-echo",
        officialColors: ["Solar Gold", "Midnight Blue"],
        representativeSymbol: "Solar wave",
        status: "Active",
      },
      heroImage: {
        imageIdentifier: "hero-image-1",
      },
      language: "ja",
      resourceType: "group",
      sections: [
        {
          id: "overview",
          type: "plaintext",
          title: "Overview",
          content: "Draft sample for checking the editor state.",
        },
      ],
      slug: "gr-aurora-echo",
      themeColor: "#4c5cff",
      translationSetIdentifier: "translation-set-1",
      version: 3,
      wikiIdentifier: "wiki-1",
    });

    expect(wiki.slug).toBe("gr-aurora-echo");
    expect(wiki.resourceType).toBe("group");
    expect(wiki.basic.resourceType).toBe("group");
    expect(wiki.basic.name).toBe("Aurora Echo");
    expect(wiki.translationSetIdentifier).toBe("translation-set-1");
    expect(wiki.translationSetIdentifier).not.toBe(wiki.wikiIdentifier);
    expect(wiki.basic.agencyName).toBe("North Harbor Entertainment");
    expect(wiki.heroImage.imageIdentifier).toBe("hero-image-1");
    expect(wiki.heroImage.alt).toBe("Aurora Echo hero image");
    expect(wiki.heroImage.src).toContain("hero-image-1");
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
            content: "Draft sample for checking the editor state.",
          },
        ],
        children: [],
      },
    ]);
  });

  it("uses backend hero image src and alt for the initial top image", () => {
    const wiki = adaptDraftWikiResponse({
      basic: {
        name: "Aurora Echo",
        normalizedName: "aurora-echo",
      },
      heroImage: {
        imageIdentifier: "hero-image-1",
        src: "https://cdn.example.test/wiki/hero-image-1.webp",
        alt: "Aurora Echo official hero",
      },
      language: "ja",
      resourceType: "group",
      sections: [],
      slug: "gr-aurora-echo",
      themeColor: null,
      translationSetIdentifier: "translation-set-1",
      version: 4,
      wikiIdentifier: "wiki-1",
    });

    expect(wiki.heroImage).toEqual({
      imageIdentifier: "hero-image-1",
      src: "https://cdn.example.test/wiki/hero-image-1.webp",
      alt: "Aurora Echo official hero",
    });
  });

  it("normalizes structured backend section contents into nested editor sections and blocks", () => {
    const wiki = adaptDraftWikiResponse({
      basic: {
        name: "Aurora Echo",
        normalizedName: "aurora-echo",
      },
      heroImage: {
        imageIdentifier: "hero-image-1",
      },
      language: "ja",
      resourceType: "group",
      sections: [
        {
          type: "section",
          title: "Overview",
          display_order: 10,
          contents: [
            {
              block_type: "text",
              display_order: 10,
              content: "Nested text",
            },
            {
              type: "section",
              title: "Highlights",
              display_order: 20,
              contents: [
                {
                  block_type: "image",
                  display_order: 10,
                  image_identifier: "image-1",
                  src: "https://cdn.example.test/wiki/image-1.webp",
                  caption: "Caption",
                  alt: "Alt text",
                },
                {
                  block_type: "image_gallery",
                  display_order: 20,
                  image_identifiers: ["image-2"],
                  images: [
                    {
                      imageIdentifier: "image-2",
                      src: "https://cdn.example.test/wiki/image-2.webp",
                      alt: "Gallery alt",
                    },
                  ],
                  caption: "Gallery",
                },
              ],
            },
          ],
        },
      ],
      slug: "gr-aurora-echo",
      themeColor: null,
      translationSetIdentifier: "translation-set-1",
      version: 3,
      wikiIdentifier: "wiki-1",
    });

    expect(wiki.sections[0]?.contents).toEqual([
      expect.objectContaining({
        blockType: "text",
        content: "Nested text",
      }),
      expect.objectContaining({
        type: "section",
        title: "Highlights",
        contents: [
          expect.objectContaining({
            blockType: "image",
            imageIdentifier: "image-1",
            imageSrc: "https://cdn.example.test/wiki/image-1.webp",
          }),
          expect.objectContaining({
            blockType: "image_gallery",
            images: [
              {
                imageIdentifier: "image-2",
                imageSrc: "https://cdn.example.test/wiki/image-2.webp",
                alt: "Gallery alt",
              },
            ],
          }),
        ],
      }),
    ]);
    expect(wiki.sections[0]?.children).toEqual([
      expect.objectContaining({
        title: "Highlights",
      }),
    ]);
  });

  it("normalizes a talent draft response into the shared detail shape", () => {
    const wiki = adaptDraftWikiResponse({
      basic: {
        birthday: "1995-09-22",
        bloodType: "A",
        englishLevel: "Advanced",
        fandomName: "ONCE",
        groups: [],
        height: 163,
        mbti: "ISFP",
        name: "Nayeon",
        normalizedName: "nayeon",
        position: "Lead Vocalist",
        realName: "Im Na-yeon",
        representativeSymbol: "Rabbit",
        zodiacSign: "Virgo",
      },
      heroImage: {},
      language: "ko",
      resourceType: "talent",
      sections: [],
      slug: "tl-nayeon-twice",
      themeColor: undefined,
      translationSetIdentifier: "translation-set-2",
      version: 7,
      wikiIdentifier: "wiki-2",
    });

    expect(wiki.resourceType).toBe("talent");
    expect(wiki.basic.resourceType).toBe("talent");
    expect(wiki.basic.realName).toBe("Im Na-yeon");
    expect(wiki.basic.height).toBe(163);
    expect(wiki.themeColor).toBeNull();
  });

  it("returns an error when the draft api base url is not configured", async () => {
    expect(createDraftWikiApiClient("")).toBeNull();
    await expect(loadDraftWikiState("ja", "gr-twice")).resolves.toEqual({
      status: "error",
      message: "Wiki draft API is not configured.",
    });
  });

  it("normalizes the backend base url to the wiki api prefix", () => {
    expect(createDraftWikiApiClient("http://127.0.0.1:8080")?.baseUrl).toBe(
      "http://127.0.0.1:8080/api/wiki",
    );
    expect(createDraftWikiApiClient("http://127.0.0.1:8080/api/wiki")?.baseUrl).toBe(
      "http://127.0.0.1:8080/api/wiki",
    );
  });

  it("builds draft wiki endpoint paths without using the generated client", () => {
    expect(getDraftWikiEndpointPath("ja", "group", "gr-aurora-echo")).toBe(
      "/wiki/ja/group/gr-aurora-echo/draft",
    );
    expect(getEditWikiEndpointPath("wiki-1")).toBe("/wiki/wiki-1/edit");
    expect(getSubmitWikiEndpointPath("wiki-1")).toBe("/wiki/wiki-1/submit");
    expect(getReviewWikiEndpointPath("wiki-1", "approve")).toBe("/wiki/wiki-1/approve");
    expect(getReviewWikiEndpointPath("wiki-1", "reject")).toBe("/wiki/wiki-1/reject");
    expect(getPublishWikiEndpointPath("wiki-1")).toBe("/wiki/wiki-1/publish");
  });

  it("builds submit wiki request bodies with the wiki id and resource type", () => {
    expect(
      createSubmitWikiRequestBody({
        resourceType: "group",
        wikiIdentifier: "wiki-1",
      }),
    ).toEqual({
      resourceType: "group",
      wikiId: "wiki-1",
    });
    expect(
      createSubmitWikiRequestBody({
        agencyIdentifier: "agency-1",
        groupIdentifiers: ["group-1"],
        resourceType: "talent",
        talentIdentifiers: ["talent-1"],
        wikiIdentifier: "wiki-2",
      }),
    ).toEqual({
      agencyIdentifier: "agency-1",
      groupIdentifiers: ["group-1"],
      resourceType: "talent",
      talentIdentifiers: ["talent-1"],
      wikiId: "wiki-2",
    });
  });

  it("builds review wiki request bodies with the resource type", () => {
    expect(
      createReviewWikiRequestBody({
        resourceType: "group",
        wikiIdentifier: "wiki-1",
      }),
    ).toEqual({
      resourceType: "group",
    });
  });

  it("builds draft wiki list urls with status, onlyMine, and optional filters", () => {
    expect(
      createWikiDraftWikisUrl({
        baseUrl: "https://api.example.test/api/wiki/",
        onlyMine: true,
        page: 2,
        perPage: 24,
        resourceType: "group",
        status: "under_review",
        translationSetIdentifier: "translation-set-1",
      }),
    ).toBe(
      "https://api.example.test/api/wiki/draft-wikis?status=under_review&perPage=24&page=2&onlyMine=true&resourceType=group&translationSetIdentifier=translation-set-1",
    );
  });

  it("fetches draft wiki lists through the browser API route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          wikis: [
            {
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
              updatedAt: "2026-05-11T00:00:00Z",
              approvedAt: null,
              translatedAt: null,
              mergedAt: null,
            },
          ],
          current_page: 1,
          last_page: 1,
          total: 1,
          per_page: 12,
        }),
        { status: 200 },
      ),
    );

    await expect(
      fetchWikiDraftWikis({
        fallbackErrorMessage: "fallback",
        onlyMine: true,
        page: 1,
        perPage: 12,
        status: "pending",
      }),
    ).resolves.toEqual(expect.objectContaining({ total: 1 }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/draft-wikis?status=pending&perPage=12&page=1&onlyMine=true",
      {
        credentials: "include",
      },
    );
  });

  it("turns api errors into a specific message", () => {
    expect(
      getDraftWikiErrorMessage({
        response: {
          status: 404,
        },
      }),
    ).toBe("Draft wiki was not found.");

    expect(
      getDraftWikiErrorMessage({
        response: {
          status: 500,
          data: {
            message: "backend exploded",
          },
        },
      }),
    ).toBe("backend exploded");
  });

  it("saves a draft wiki with the wiki identifier as the edit path param", async () => {
    const client = {
      saveDraftWiki: vi.fn().mockResolvedValue({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "draft",
      }),
    };
    const body = {
      resourceType: "group",
      basic: { name: "Aurora Echo" },
      sections: [],
      themeColor: "#4c5cff",
    };

    await expect(saveDraftWiki(client as never, "wiki-1", body)).resolves.toEqual({
      language: "ja",
      name: "Aurora Echo",
      resourceType: "group",
      status: "draft",
    });
    expect(client.saveDraftWiki).toHaveBeenCalledWith("wiki-1", body);
  });

  it("submits a draft wiki with the wiki identifier as the submit path param", async () => {
    const client = {
      submitDraftWiki: vi.fn().mockResolvedValue({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "under_review",
      }),
    };
    const body = {
      resourceType: "group",
      wikiId: "wiki-1",
    };

    await expect(submitDraftWiki(client as never, "wiki-1", body)).resolves.toEqual({
      language: "ja",
      name: "Aurora Echo",
      resourceType: "group",
      status: "under_review",
    });
    expect(client.submitDraftWiki).toHaveBeenCalledWith("wiki-1", body);
  });

  it("reviews a draft wiki with the wiki identifier as the review path param", async () => {
    const client = {
      reviewDraftWiki: vi.fn().mockResolvedValue({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "approved",
      }),
    };
    const body = {
      wikiId: "wiki-1",
    };

    await expect(reviewDraftWiki(client as never, "wiki-1", "approve", body)).resolves.toEqual({
      language: "ja",
      name: "Aurora Echo",
      resourceType: "group",
      status: "approved",
    });
    expect(client.reviewDraftWiki).toHaveBeenCalledWith("wiki-1", "approve", body);
  });

  it("publishes a draft wiki with the wiki identifier as the publish path param", async () => {
    const client = {
      reviewDraftWiki: vi.fn().mockResolvedValue({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "approved",
      }),
    };
    const body = {
      resourceType: "group",
    };

    await expect(publishDraftWiki(client as never, "wiki-1", body)).resolves.toEqual({
      language: "ja",
      name: "Aurora Echo",
      resourceType: "group",
      status: "approved",
    });
    expect(client.reviewDraftWiki).toHaveBeenCalledWith("wiki-1", "publish", body);
  });

  it("loads a draft wiki through fetch and parses the response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          basic: {
            emoji: "☀",
            fandomName: "Daybreak",
            generation: "5th",
            groupType: "Girl Group",
            name: "Aurora Echo",
            normalizedName: "aurora-echo",
            officialColors: ["Solar Gold"],
            representativeSymbol: "Solar wave",
          },
          heroImage: {
            imageIdentifier: "hero-image-1",
          },
          language: "ja",
          resourceType: "group",
          sections: [],
          slug: "gr-aurora-echo",
          translationSetIdentifier: "translation-set-1",
          version: 1,
          wikiIdentifier: "wiki-1",
        }),
        { status: 200 },
      ),
    );
    const client = createDraftWikiApiClient("http://127.0.0.1:8080");

    await expect(fetchDraftWiki(client!, "ja", "gr-aurora-echo")).resolves.toEqual(
      expect.objectContaining({
        slug: "gr-aurora-echo",
        translationSetIdentifier: "translation-set-1",
        wikiIdentifier: "wiki-1",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/wiki/wiki/ja/group/gr-aurora-echo/draft",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }),
    );
  });

  it("forwards cookie headers when saving a draft wiki through fetch", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          language: "ja",
          name: "Aurora Echo",
          resourceType: "group",
          status: "draft",
        }),
        { status: 200 },
      ),
    );
    const client = createDraftWikiApiClient("http://127.0.0.1:8080", {
      Accept: "application/json",
      "Accept-Language": "ja,en;q=0.9",
      Cookie: "laravel_session=session-value",
    });
    const body = {
      resourceType: "group",
      basic: { name: "Aurora Echo" },
      sections: [],
      themeColor: "#4c5cff",
    };

    await expect(client!.saveDraftWiki("wiki-1", body)).resolves.toEqual({
      language: "ja",
      name: "Aurora Echo",
      resourceType: "group",
      status: "draft",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/wiki/wiki/wiki-1/edit",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja,en;q=0.9",
          "Content-Type": "application/json",
          Cookie: "laravel_session=session-value",
        },
        method: "POST",
      }),
    );
  });

  it("forwards cookie headers when submitting a draft wiki through fetch", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          language: "ja",
          name: "Aurora Echo",
          resourceType: "group",
          status: "under_review",
        }),
        { status: 201 },
      ),
    );
    const client = createDraftWikiApiClient("http://127.0.0.1:8080", {
      Accept: "application/json",
      "Accept-Language": "ja,en;q=0.9",
      Cookie: "laravel_session=session-value",
    });
    const body = {
      resourceType: "group",
      wikiId: "wiki-1",
    };

    await expect(client!.submitDraftWiki("wiki-1", body)).resolves.toEqual({
      language: "ja",
      name: "Aurora Echo",
      resourceType: "group",
      status: "under_review",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/wiki/wiki/wiki-1/submit",
      expect.objectContaining({
        body: JSON.stringify(body),
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja,en;q=0.9",
          "Content-Type": "application/json",
          Cookie: "laravel_session=session-value",
        },
        method: "POST",
      }),
    );
  });

  it("forwards cookie headers when reviewing a draft wiki through fetch", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            language: "ja",
            name: "Aurora Echo",
            resourceType: "group",
            status: "approved",
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            language: "ja",
            name: "Aurora Echo",
            resourceType: "group",
            status: "rejected",
          }),
          { status: 201 },
        ),
      );
    const client = createDraftWikiApiClient("http://127.0.0.1:8080", {
      Accept: "application/json",
      "Accept-Language": "ja,en;q=0.9",
      Cookie: "laravel_session=session-value",
    });
    const body = {
      wikiId: "wiki-1",
    };

    await expect(client!.reviewDraftWiki("wiki-1", "approve", body)).resolves.toEqual({
      language: "ja",
      name: "Aurora Echo",
      resourceType: "group",
      status: "approved",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/wiki/wiki/wiki-1/approve",
      expect.objectContaining({
        body: JSON.stringify(body),
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja,en;q=0.9",
          "Content-Type": "application/json",
          Cookie: "laravel_session=session-value",
        },
        method: "POST",
      }),
    );
  });

  it("forwards cookie headers when publishing a draft wiki through fetch", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          language: "ja",
          name: "Aurora Echo",
          resourceType: "group",
          status: "approved",
        }),
        { status: 201 },
      ),
    );
    const client = createDraftWikiApiClient("http://127.0.0.1:8080", {
      Accept: "application/json",
      "Accept-Language": "ja,en;q=0.9",
      Cookie: "laravel_session=session-value",
    });
    const body = {
      resourceType: "group",
    };

    await expect(client!.reviewDraftWiki("wiki-1", "publish", body)).resolves.toEqual({
      language: "ja",
      name: "Aurora Echo",
      resourceType: "group",
      status: "approved",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/wiki/wiki/wiki-1/publish",
      expect.objectContaining({
        body: JSON.stringify(body),
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja,en;q=0.9",
          "Content-Type": "application/json",
          Cookie: "laravel_session=session-value",
        },
        method: "POST",
      }),
    );
  });

  it("reviews and publishes draft wikis through the browser API routes", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            language: "ja",
            name: "Aurora Echo",
            resourceType: "group",
            status: "approved",
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            language: "ja",
            name: "Aurora Echo",
            resourceType: "group",
            status: "approved",
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            language: "ja",
            name: "Aurora Echo",
            resourceType: "group",
            status: "rejected",
          }),
          { status: 201 },
        ),
      );
    const requestBody = { resourceType: "group" };

    await expect(
      approveWikiDraft({
        fallbackErrorMessage: "failed",
        requestBody,
        wikiId: "wiki-1",
      }),
    ).resolves.toEqual({
      language: "ja",
      name: "Aurora Echo",
      resourceType: "group",
      status: "approved",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/drafts/wiki-1/approve",
      expect.objectContaining({
        body: JSON.stringify(requestBody),
        credentials: "include",
        method: "POST",
      }),
    );

    await rejectWikiDraft({
      fallbackErrorMessage: "failed",
      requestBody,
      wikiId: "wiki-1",
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/wiki/drafts/wiki-1/reject",
      expect.objectContaining({
        body: JSON.stringify(requestBody),
        credentials: "include",
        method: "POST",
      }),
    );

    await publishWikiDraft({
      fallbackErrorMessage: "failed",
      requestBody,
      wikiId: "wiki-1",
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/wiki/drafts/wiki-1/publish",
      expect.objectContaining({
        body: JSON.stringify(requestBody),
        credentials: "include",
        method: "POST",
      }),
    );
  });
});

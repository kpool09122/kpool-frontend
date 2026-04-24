import { describe, expect, it, vi } from "vitest";

import {
  adaptDraftWikiResponse,
  createDraftWikiApiClient,
  getDraftWikiAlias,
  getDraftWikiErrorMessage,
  loadDraftWikiState,
  saveDraftWiki,
} from "./draftWiki";

describe("draftWiki", () => {
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
      version: 3,
      wikiIdentifier: "wiki-1",
    });

    expect(wiki.slug).toBe("gr-aurora-echo");
    expect(wiki.resourceType).toBe("group");
    expect(wiki.basic.resourceType).toBe("group");
    expect(wiki.basic.name).toBe("Aurora Echo");
    expect(wiki.basic.agencyName).toBe("North Harbor Entertainment");
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
    expect(createDraftWikiApiClient("http://127.0.0.1:8080")?.baseURL).toBe(
      "http://127.0.0.1:8080/api/wiki",
    );
    expect(createDraftWikiApiClient("http://127.0.0.1:8080/api/wiki")?.baseURL).toBe(
      "http://127.0.0.1:8080/api/wiki",
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
      WikiOperations_editWiki: vi.fn().mockResolvedValue({
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
    expect(client.WikiOperations_editWiki).toHaveBeenCalledWith(body, {
      params: {
        wikiId: "wiki-1",
      },
    });
  });
});

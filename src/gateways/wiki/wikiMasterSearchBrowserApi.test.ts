import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWikiMasterSearch } from "./wikiMasterSearchBrowserApi";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wikiMasterSearchBrowserApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches master search results through the browser route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        wikis: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "TWICE",
            slug: "gr-twice",
            resourceType: "group",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWikiMasterSearch({
      fallbackErrorMessage: "Master search failed",
      keyword: "twice",
      language: "ja",
      resourceType: "group",
    });

    expect(result.wikis).toEqual([
      expect.objectContaining({
        name: "TWICE",
        wikiIdentifier: "11111111-1111-4111-8111-111111111111",
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/master-search?language=ja&resourceType=group&keyword=twice&limit=20",
    );
  });

  it("does not call the route for blank keywords", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWikiMasterSearch({
        fallbackErrorMessage: "Master search failed",
        keyword: "  ",
        language: "ja",
        resourceType: "group",
      }),
    ).resolves.toEqual({ wikis: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws route error messages for non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Master search failed" }, 503)),
    );

    await expect(
      fetchWikiMasterSearch({
        fallbackErrorMessage: "Fallback master search failed",
        keyword: "twice",
        language: "ja",
        resourceType: "group",
      }),
    ).rejects.toThrow("Master search failed");
  });
});

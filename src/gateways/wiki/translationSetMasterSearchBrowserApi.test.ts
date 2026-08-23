import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchTranslationSetMasterSearch } from "./translationSetMasterSearchBrowserApi";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("translationSetMasterSearchBrowserApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches translation set master search results and prefers the UI locale display wiki", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        translationSetMasters: [
          {
            translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
            resourceType: "agency",
            wikis: [
              {
                wikiIdentifier: "22222222-2222-4222-8222-222222222222",
                language: "ja",
                name: "日本語名",
                slug: "ja-name",
              },
              {
                wikiIdentifier: "33333333-3333-4333-8333-333333333333",
                language: "en",
                name: "English Name",
                slug: "en-name",
              },
            ],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTranslationSetMasterSearch({
      fallbackErrorMessage: "Master search failed",
      keyword: " twice ",
      locale: "en",
      resourceType: "agency",
    });

    expect(result.translationSetMasters[0]?.displayWiki).toEqual(
      expect.objectContaining({ name: "English Name", slug: "en-name" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/translation-set-master-search?resourceType=agency&keyword=twice&limit=20",
    );
  });

  it("falls back to another language when the UI locale wiki is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          translationSetMasters: [
            {
              translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
              resourceType: "talent",
              wikis: [
                {
                  wikiIdentifier: "22222222-2222-4222-8222-222222222222",
                  language: "ja",
                  name: "日本語名",
                  slug: "ja-name",
                },
              ],
            },
          ],
        }),
      ),
    );

    await expect(
      fetchTranslationSetMasterSearch({
        fallbackErrorMessage: "Master search failed",
        keyword: "twice",
        locale: "ko",
        resourceType: "talent",
      }),
    ).resolves.toMatchObject({
      translationSetMasters: [
        { displayWiki: { name: "日本語名" } },
      ],
    });
  });

  it("does not call the route for blank keywords", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchTranslationSetMasterSearch({
        fallbackErrorMessage: "Master search failed",
        keyword: "  ",
        locale: "ja",
        resourceType: "agency",
      }),
    ).resolves.toEqual({ translationSetMasters: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws route error messages for non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "検索エラー" }, 503)),
    );

    await expect(
      fetchTranslationSetMasterSearch({
        fallbackErrorMessage: "Fallback master search failed",
        keyword: "twice",
        locale: "ja",
        resourceType: "agency",
      }),
    ).rejects.toThrow("検索エラー");
  });
});

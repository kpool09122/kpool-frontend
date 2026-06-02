import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWikiRelatedProfiles } from "./wikiRelatedProfilesBrowserApi";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wikiRelatedProfilesBrowserApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches related profiles through the browser related profiles route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        profiles: [
          {
            wikiIdentifier: "11111111-1111-1111-1111-111111111111",
            slug: "tl-momo",
            language: "ja",
            resourceType: "talent",
            name: "MOMO",
            normalizedName: "momo",
            imageIdentifier: null,
            imageUrl: null,
            imageAltText: null,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWikiRelatedProfiles({
      fallbackErrorMessage: "Related profiles failed",
      language: "ja",
      resourceType: "talent",
      slug: "gr-twice",
    });

    expect(result.profiles.map((profile) => profile.slug)).toEqual(["tl-momo"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/ja/gr-twice/related-profiles?resourceType=talent",
    );
  });

  it("throws route error messages for non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Related profiles failed" }, 503)),
    );

    await expect(
      fetchWikiRelatedProfiles({
        fallbackErrorMessage: "Fallback related profiles failed",
        language: "ja",
        resourceType: "talent",
        slug: "gr-twice",
      }),
    ).rejects.toThrow("Related profiles failed");
  });

  it("throws the fallback message when a non-2xx response has no route message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: true }, 503)));

    await expect(
      fetchWikiRelatedProfiles({
        fallbackErrorMessage: "Fallback related profiles failed",
        language: "ja",
        resourceType: "talent",
        slug: "gr-twice",
      }),
    ).rejects.toThrow("Fallback related profiles failed");
  });

  it("rejects invalid successful route responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ profiles: null })));

    await expect(
      fetchWikiRelatedProfiles({
        fallbackErrorMessage: "Fallback related profiles failed",
        language: "ja",
        resourceType: "talent",
        slug: "gr-twice",
      }),
    ).rejects.toThrow();
  });

  it("throws the fallback message when a route response is malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchWikiRelatedProfiles({
        fallbackErrorMessage: "Fallback related profiles failed",
        language: "ja",
        resourceType: "talent",
        slug: "gr-twice",
      }),
    ).rejects.toThrow("Fallback related profiles failed");
  });
});

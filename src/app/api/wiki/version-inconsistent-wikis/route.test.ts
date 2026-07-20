import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const createRequest = (url: string, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(url, {
    method: "GET",
    headers,
  });

describe("wiki version inconsistent wikis route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards query, cookie, and accept-language headers to the backend route", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          wikis: [
            {
              wikiIdentifier: "88888888-8888-8888-8888-888888888888",
              translationSetIdentifier: "99999999-9999-9999-9999-999999999999",
              slug: "gr-review-wiki",
              language: "ja",
              resourceType: "group",
              version: 3,
              themeColor: "#4c5cff",
              imageIdentifier: null,
              isHidden: false,
              imageUrl: null,
              imageAltText: null,
              name: "未翻訳 Wiki",
              normalizedName: "untranslated-wiki",
              publishedAt: "2026-05-10T00:00:00Z",
              updatedAt: "2026-05-11T00:00:00Z",
            },
          ],
          current_page: 2,
          last_page: 3,
          total: 25,
          per_page: 12,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest(
      "https://app.example.test/api/wiki/version-inconsistent-wikis?perPage=12&page=2&resourceType=group&sort=updatedAt&order=desc",
      {
        "accept-language": "ja",
        cookie: "session=abc",
      },
    ));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/wikis/version-inconsistencies?perPage=12&page=2&resourceType=group&sort=updatedAt&order=desc",
      expect.objectContaining({
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "session=abc",
        },
      }),
    );
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ total: 25 }));
  });

  it("logs backend failure status without exposing the backend error body", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ message: "Internal backend path /var/app" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const response = await GET(
      createRequest("https://app.example.test/api/wiki/version-inconsistent-wikis"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toBe(
      "Wiki drafts are temporarily unavailable. Please try again later.",
    );
    expect(consoleError).toHaveBeenCalledWith(
      "Wiki version inconsistent backend request failed",
      { status: 503 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("/var/app");
  });
});

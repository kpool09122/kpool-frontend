import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const createRequest = (url: string, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(url, { method: "GET", headers });

describe("wiki master search route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards language, resourceType and keyword to the backend route", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          wikis: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              name: "TWICE",
              slug: "gr-twice",
              resourceType: "group",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      createRequest(
        "https://app.example.test/api/wiki/master-search?language=ja&resourceType=group&keyword=twice&limit=10",
        { "accept-language": "ja", cookie: "session=abc" },
      ),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/wikis/ja/masters?resourceType=group&keyword=twice&limit=10",
      expect.objectContaining({
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "session=abc",
        },
      }),
    );
    await expect(response.json()).resolves.toEqual({
      wikis: [
        expect.objectContaining({
          name: "TWICE",
          wikiIdentifier: "11111111-1111-4111-8111-111111111111",
        }),
      ],
    });
  });

  it("returns 400 without calling backend when keyword is empty", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      createRequest("https://app.example.test/api/wiki/master-search?language=ja&resourceType=group&keyword="),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

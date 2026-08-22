import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const createRequest = (url: string, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(url, { method: "GET", headers });

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const translationSetSearchBody = {
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
      ],
    },
  ],
};

describe("translation set master search route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards resourceType, keyword, limit, cookie, and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(translationSetSearchBody));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      createRequest(
        "https://app.example.test/api/wiki/translation-set-master-search?resourceType=agency&keyword=twice&limit=20",
        {
          "accept-language": "ja",
          cookie: "session=abc",
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(translationSetSearchBody);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/wiki-translation-sets/masters?resourceType=agency&keyword=twice&limit=20",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Accept-Language": "ja",
          Cookie: "session=abc",
        }),
        cache: "no-store",
      }),
    );
  });

  it("rejects invalid query before calling backend", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      createRequest("https://app.example.test/api/wiki/translation-set-master-search?resourceType=agency"),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose backend messages from errors", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "internal stack /var/app" }, 503)),
    );

    const response = await GET(
      createRequest("https://app.example.test/api/wiki/translation-set-master-search?resourceType=agency&keyword=twice"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toBe("Translation set master search is temporarily unavailable. Please try again later.");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("/var/app");
  });
});

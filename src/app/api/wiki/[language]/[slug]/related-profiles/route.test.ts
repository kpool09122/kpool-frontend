import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const internalBackendMessage = "Internal backend path /var/app";

const createRequest = (url: string, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(url, {
    method: "GET",
    headers,
  });

const createContext = (language = "ja", slug = "gr-twice") => ({
  params: Promise.resolve({ language, slug }),
});

describe("wiki related profiles route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards resourceType, cookie, and accept-language headers to the backend route", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
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
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      createRequest(
        "https://app.example.test/api/wiki/ja/gr-twice/related-profiles?resourceType=talent",
        {
          "accept-language": "ja",
          cookie: "session=abc",
        },
      ),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/wiki/ja/gr-twice/related-profiles?resourceType=talent",
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
      profiles: [
        expect.objectContaining({
          slug: "tl-momo",
        }),
      ],
    });
  });

  it("returns a route error without calling backend when resourceType is missing", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      createRequest("https://app.example.test/api/wiki/ja/gr-twice/related-profiles"),
      createContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("resourceType is required.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a route error without calling backend when resourceType is invalid", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      createRequest(
        "https://app.example.test/api/wiki/ja/gr-twice/related-profiles?resourceType=invalid",
      ),
      createContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("resourceType is required.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a generic related profile load failure for backend errors", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: internalBackendMessage }), {
          status: 422,
        }),
      ),
    );

    const response = await GET(
      createRequest(
        "https://app.example.test/api/wiki/ja/gr-twice/related-profiles?resourceType=group",
      ),
      createContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.message).toBe(
      "Related profiles are temporarily unavailable. Please try again later.",
    );
    expect(consoleError).toHaveBeenCalledWith(
      "Wiki related profiles backend request failed",
      expect.objectContaining({ status: 422 }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(internalBackendMessage);
  });
});

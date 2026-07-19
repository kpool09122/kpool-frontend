import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const createRequest = (url: string, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(url, {
    method: "GET",
    headers,
  });

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki image deletion requests route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards list requests with pagination, cookie, and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      images: [],
      current_page: 2,
      last_page: 2,
      total: 12,
      per_page: 6,
    }, 200));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest(
      "https://app.example.test/api/wiki/image-deletion-requests?perPage=6&page=2",
      { "accept-language": "ja", cookie: "session=abc" },
    ));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/image-deletion-requests?perPage=6&page=2",
      expect.objectContaining({
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "session=abc",
        },
      }),
    );
  });

  it("hides backend error details", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Internal /var/app" }, 403)));

    const response = await GET(createRequest("https://app.example.test/api/wiki/image-deletion-requests"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("Wiki images are temporarily unavailable. Please try again later.");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("/var/app");
  });

  it("returns 502 on schema mismatch", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200)));

    const response = await GET(createRequest("https://app.example.test/api/wiki/image-deletion-requests"));

    expect(response.status).toBe(502);
  });
});

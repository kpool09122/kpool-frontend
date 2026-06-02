import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const wikiId = "44444444-4444-4444-4444-444444444444";
const internalBackendMessage = "Internal backend path /var/app";
const wikiDraftUnavailableMessage =
  "Wiki drafts are temporarily unavailable. Please try again later.";

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/wiki/drafts/${wikiId}/withdraw`, {
    method: "POST",
    headers,
  }) as NextRequest;

const createContext = () => ({
  params: Promise.resolve({ wikiId }),
});

const jsonResponse = (body: unknown, status = 201) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki draft withdraw route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards withdraw requests with cookie and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "pending",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      createRequest({
        "accept-language": "ja",
        cookie: "session=abc",
      }),
      createContext(),
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/wiki/wiki/${wikiId}/withdraw`,
      expect.objectContaining({
        cache: "no-store",
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "session=abc",
        },
      }),
    );
  });

  it("returns 500 when the backend base URL is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest(), createContext());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Wiki draft API is not configured.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose backend messages from withdraw errors", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: internalBackendMessage }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const response = await POST(createRequest(), createContext());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe(wikiDraftUnavailableMessage);
    expect(body.message).not.toContain("/var/app");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to withdraw wiki draft.",
      { wikiId, status: 503 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(internalBackendMessage);
  });
});

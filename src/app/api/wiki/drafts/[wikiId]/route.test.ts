import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { DELETE, POST } from "./route";

const wikiId = "44444444-4444-4444-4444-444444444444";
const internalBackendMessage = "Internal backend path /var/app";
const wikiDraftUnavailableMessage =
  "Wiki drafts are temporarily unavailable. Please try again later.";

const createRequest = (
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest =>
  new Request(`https://app.example.test/api/wiki/drafts/${wikiId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

const createDeleteRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/wiki/drafts/${wikiId}`, {
    method: "DELETE",
    headers,
  }) as NextRequest;

const createContext = () => ({
  params: Promise.resolve({ wikiId }),
});

const jsonResponse = (body: unknown, status = 201): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki draft save route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards save requests with body, cookie, and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        language: "ja",
        name: "Saved Aurora Echo",
        resourceType: "group",
        status: "editing",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = {
      name: "Aurora Echo",
      resourceType: "group",
      wikiId,
    };
    const response = await POST(
      createRequest(body, {
        "accept-language": "ja",
        cookie: "session=abc",
      }),
      createContext(),
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/wiki/wiki/${wikiId}/edit`,
      expect.objectContaining({
        body: JSON.stringify(body),
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "session=abc",
        },
      }),
    );
  });

  it("does not expose backend messages from save errors", async () => {
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

    const response = await POST(
      createRequest({ resourceType: "group", wikiId }),
      createContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe(wikiDraftUnavailableMessage);
    expect(body.message).not.toContain("/var/app");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to save wiki draft.",
      { wikiId, status: 503 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(internalBackendMessage);
  });

  it("forwards delete requests with cookie and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await DELETE(
      createDeleteRequest({
        "accept-language": "ja",
        cookie: "session=abc",
      }),
      createContext(),
    );

    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/wiki/wiki/${wikiId}`,
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Cookie: "session=abc",
          "Accept-Language": "ja",
        },
        method: "DELETE",
      }),
    );
  });

  it("does not expose backend messages from delete errors", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: internalBackendMessage }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const response = await DELETE(createDeleteRequest(), createContext());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe(wikiDraftUnavailableMessage);
    expect(body.message).not.toContain("/var/app");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to delete wiki draft.",
      { wikiId, status: 403 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(internalBackendMessage);
  });
});

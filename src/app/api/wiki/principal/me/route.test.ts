import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { wikiPrincipalUnavailableMessage } from "@/gateways/wiki/wikiPrincipal";
import { GET } from "./route";

const principal = {
  principalIdentifier: "33333333-3333-3333-3333-333333333333",
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  isDelegatedPrincipal: false,
  isEnabled: true,
  policies: [],
};

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/wiki/principal/me", {
    method: "GET",
    headers,
  }) as NextRequest;

const jsonResponse = (
  body: unknown,
  init: ResponseInit = {},
): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

describe("/api/wiki/principal/me route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards request headers to the private Wiki principal endpoint", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://wiki.example.test");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(principal));
    vi.stubGlobal("fetch", fetchMock);

    await GET(createRequest({
      "accept-language": "ja,en;q=0.9",
      cookie: "session=wiki-session",
    }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://wiki.example.test/api/wiki/principal/me",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja,en;q=0.9",
          Cookie: "session=wiki-session",
        },
        cache: "no-store",
      },
    );
  });

  it("preserves upstream 404 as a missing principal response", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://wiki.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ message: "Wiki principal was not found." }, { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Wiki principal was not found.");
  });

  it("does not expose upstream 500 details to the client", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://wiki.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { message: "database failed at internal.wiki.example.test" },
        { status: 500 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe(wikiPrincipalUnavailableMessage);
    expect(body.message).not.toContain("internal.wiki.example.test");
  });

  it("does not expose internal fetch errors to the client", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://internal.wiki.example.test");
    const fetchMock = vi.fn().mockRejectedValue(
      new Error("getaddrinfo ENOTFOUND internal.wiki.example.test"),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe(wikiPrincipalUnavailableMessage);
    expect(body.message).not.toContain("internal.wiki.example.test");
  });
});

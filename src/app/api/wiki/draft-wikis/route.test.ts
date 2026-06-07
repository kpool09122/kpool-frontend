import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "./route";

const createRequest = (url: string, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(url, {
    method: "GET",
    headers,
  });

const createPostRequest = (
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest =>
  new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki draft wikis route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("logs backend failure status without exposing the backend error body", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ message: "Internal backend path /var/app" }, 503),
      ),
    );

    const response = await GET(
      createRequest("https://app.example.test/api/wiki/draft-wikis?status=pending"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toBe(
      "Wiki drafts are temporarily unavailable. Please try again later.",
    );
    expect(consoleError).toHaveBeenCalledWith(
      "Wiki draft wikis backend request failed",
      { status: 503 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("/var/app");
  });

  it("forwards draft wiki creation to the backend create endpoint", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        language: "ja",
        name: "New Wiki",
        resourceType: "group",
        status: "pending",
        wikiIdentifier: "88888888-8888-4888-8888-888888888888",
      }, 201),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      createPostRequest("https://app.example.test/api/wiki/draft-wikis", {
        language: "ja",
        resourceType: "group",
        basic: { name: "New Wiki" },
        sections: [],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      language: "ja",
      name: "New Wiki",
      resourceType: "group",
      status: "pending",
      wikiIdentifier: "88888888-8888-4888-8888-888888888888",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/wiki/create",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          language: "ja",
          resourceType: "group",
          basic: { name: "New Wiki" },
          sections: [],
        }),
      }),
    );
  });
});

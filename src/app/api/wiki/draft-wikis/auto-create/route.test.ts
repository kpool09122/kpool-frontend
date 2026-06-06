import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

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

describe("wiki draft wiki auto-create route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards auto-create requests to the backend auto-create endpoint", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        language: "ja",
        name: "Generated Wiki",
        resourceType: "group",
        status: "pending",
      }, 201),
    );
    vi.stubGlobal("fetch", fetchMock);

    const requestBody = {
      resourceType: "group",
      language: "ja",
      name: "Generated Wiki",
      slug: "gr-generated-wiki",
      agencyIdentifier: null,
      groupIdentifiers: [],
      talentIdentifiers: [],
    };
    const response = await POST(
      createPostRequest("https://app.example.test/api/wiki/draft-wikis/auto-create", requestBody, {
        Cookie: "session=abc",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      language: "ja",
      name: "Generated Wiki",
      resourceType: "group",
      status: "pending",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/wiki/auto-create",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: expect.objectContaining({
          Cookie: "session=abc",
        }),
      }),
    );
  });

  it("does not expose backend auto-create error bodies", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ message: "internal provider key leaked" }, 500),
      ),
    );

    const response = await POST(
      createPostRequest("https://app.example.test/api/wiki/draft-wikis/auto-create", {
        resourceType: "group",
        language: "ja",
        name: "Generated Wiki",
        slug: "gr-generated-wiki",
        agencyIdentifier: null,
        groupIdentifiers: [],
        talentIdentifiers: [],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe(
      "Wiki drafts are temporarily unavailable. Please try again later.",
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("provider key");
  });
});

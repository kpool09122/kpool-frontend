import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import {
  wikiDraftReviewCsrfHeaderName,
  wikiDraftReviewCsrfHeaderValue,
} from "@/gateways/wiki/draftWiki";
import { POST as approvePOST } from "./approve/route";
import { POST as publishPOST } from "./publish/route";
import { POST as rejectPOST } from "./reject/route";

const wikiId = "44444444-4444-4444-4444-444444444444";

const createRequest = (body: unknown, headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/wiki/drafts/${wikiId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [wikiDraftReviewCsrfHeaderName]: wikiDraftReviewCsrfHeaderValue,
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

const createContext = () => ({
  params: Promise.resolve({ wikiId }),
});

const jsonResponse = (body: unknown, status = 201): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki draft review route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards approve requests with body, cookie, and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "approved",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = { resourceType: "group" };
    const response = await approvePOST(
      createRequest(body, {
        "accept-language": "ja",
        cookie: "session=abc",
      }),
      createContext(),
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/wiki/wiki/${wikiId}/approve`,
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

  it("forwards reject requests to the reject backend action", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "rejected",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = { resourceType: "group" };
    const response = await rejectPOST(createRequest(body), createContext());

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/wiki/wiki/${wikiId}/reject`,
      expect.objectContaining({
        body: JSON.stringify(body),
        method: "POST",
      }),
    );
  });

  it("forwards publish requests to the publish backend action", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        version: 2,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = { resourceType: "group" };
    const response = await publishPOST(createRequest(body), createContext());

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/wiki/wiki/${wikiId}/publish`,
      expect.objectContaining({
        body: JSON.stringify(body),
        method: "POST",
      }),
    );
  });


  it("returns 500 when the backend base URL is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await approvePOST(
      createRequest({ resourceType: "group", wikiId }),
      createContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Wiki draft API is not configured.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects POST requests that do not include the review request header", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await approvePOST(
      new Request(`https://app.example.test/api/wiki/drafts/${wikiId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resourceType: "group" }),
      }) as NextRequest,
      createContext(),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

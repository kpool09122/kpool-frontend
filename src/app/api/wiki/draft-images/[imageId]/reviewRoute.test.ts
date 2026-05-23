import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import {
  wikiDraftImageReviewCsrfHeaderName,
  wikiDraftImageReviewCsrfHeaderValue,
} from "@kpool/wiki";
import { POST as approvePOST } from "./approve/route";
import { POST as rejectPOST } from "./reject/route";

const imageId = "44444444-4444-4444-4444-444444444444";

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/wiki/draft-images/${imageId}/approve`, {
    method: "POST",
    headers: {
      [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue,
      ...headers,
    },
  }) as NextRequest;

const createContext = () => ({
  params: Promise.resolve({ imageId }),
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki draft image review route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards approve requests with cookie and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        imageIdentifier: imageId,
        resourceType: "group",
        status: "approved",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await approvePOST(
      createRequest({
        "accept-language": "ja",
        cookie: "session=abc",
      }),
      createContext(),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/wiki/image/${imageId}/approve`,
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "session=abc",
        },
      }),
    );
  });

  it("forwards reject requests to the reject backend action", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        imageIdentifier: imageId,
        resourceType: "group",
        isHidden: false,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await rejectPOST(createRequest(), createContext());

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/wiki/image/${imageId}/reject`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects POST requests that do not include the review request header", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await approvePOST(
      new Request(`https://app.example.test/api/wiki/draft-images/${imageId}/approve`, {
        method: "POST",
      }) as NextRequest,
      createContext(),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns backend errors without parsing them as successful review responses", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ title: "Forbidden" }, 403)));

    const response = await approvePOST(createRequest(), createContext());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toContain("403");
  });

  it("returns 502 when the backend response does not match the schema", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true })));

    const response = await approvePOST(createRequest(), createContext());

    expect(response.status).toBe(502);
  });

  it("returns 500 when the backend base URL is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await approvePOST(createRequest(), createContext());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Wiki image API is not configured.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

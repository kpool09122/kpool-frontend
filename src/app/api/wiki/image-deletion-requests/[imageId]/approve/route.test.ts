import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { wikiDraftImageReviewCsrfHeaderName, wikiDraftImageReviewCsrfHeaderValue } from "@kpool/wiki";

import { POST } from "./route";

const imageId = "44444444-4444-4444-4444-444444444444";

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/wiki/image-deletion-requests/${imageId}/approve`, {
    method: "POST",
    headers,
  }) as NextRequest;

const createContext = () => ({ params: Promise.resolve({ imageId }) });
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("wiki image deletion request approve route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("requires the review header", async () => {
    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(403);
  });

  it("forwards approval requests with cookie and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      imageIdentifier: imageId,
      isHidden: true,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({
      [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue,
      "accept-language": "ja",
      cookie: "session=abc",
    }), createContext());

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/wiki/image/${imageId}/approve-deletion`,
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

  it("returns 502 on response schema mismatch", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true })));

    const response = await POST(createRequest({
      [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue,
    }), createContext());

    expect(response.status).toBe(502);
  });
});

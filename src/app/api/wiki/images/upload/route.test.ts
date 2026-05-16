import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import {
  wikiImageMaxBase64Length,
  wikiImageMaxUploadBodyBytes,
} from "../../../../wiki/wikiImageModel";
import { POST } from "./route";

const createUploadBody = (base64EncodedImage = "aGVsbG8=") => ({
  resourceType: "group",
  translationSetIdentifier: "55555555-5555-5555-5555-555555555555",
  base64EncodedImage,
  displayOrder: 1,
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Upload.png",
  sourceName: "Wikimedia Commons",
  altText: "Stage upload",
  agreedToTermsAt: "2026-05-09T00:00:00.000Z",
  rightsConfirmationAgreed: true,
});

const createRequest = (body: unknown, headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/wiki/images/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

const createUnreadableJsonRequest = (
  headers: Record<string, string> = {},
): NextRequest =>
  ({
    headers: new Headers({
      "Content-Type": "application/json",
      ...headers,
    }),
    json: vi.fn().mockRejectedValue(new Error("json must not be read")),
  }) as unknown as NextRequest;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki image upload route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("returns 413 before reading JSON when Content-Length exceeds the upload limit", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = createUnreadableJsonRequest({
      "content-length": String(wikiImageMaxUploadBodyBytes + 1),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.message).toBe("Wiki image upload body is too large.");
    expect(request.json).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 411 before reading JSON when Content-Length is missing", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = createUnreadableJsonRequest();

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(411);
    expect(body.message).toBe("Wiki image upload content length is required.");
    expect(request.json).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 before reading JSON when Content-Length is not numeric", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = createUnreadableJsonRequest({ "content-length": "many" });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Wiki image upload content length is invalid.");
    expect(request.json).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 422 when the encoded image exceeds the schema limit", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const body = createUploadBody("a".repeat(wikiImageMaxBase64Length + 1));
    const response = await POST(
      createRequest(body, { "content-length": String(JSON.stringify(body).length) }),
    );

    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards valid uploads to the backend image upload endpoint", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          imageIdentifier: "44444444-4444-4444-4444-444444444444",
          resourceType: "group",
          status: "draft",
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = createUploadBody();
    const response = await POST(
      createRequest(body, { "content-length": String(JSON.stringify(body).length) }),
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/image/upload",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});

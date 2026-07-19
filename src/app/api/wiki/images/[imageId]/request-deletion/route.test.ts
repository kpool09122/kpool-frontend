import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const imageId = "44444444-4444-4444-4444-444444444444";
const requestBody = {
  requesterName: "KPool User",
  requesterEmail: "user@example.test",
  reason: "Rights concern",
};

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/wiki/images/${imageId}/request-deletion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(requestBody),
  }) as NextRequest;

const createContext = () => ({
  params: Promise.resolve({ imageId }),
});

const jsonResponse = (body: unknown, status = 201): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki image deletion request route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards deletion requests with body, cookie and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        imageIdentifier: imageId,
        requesterName: "KPool User",
        requesterEmail: "user@example.test",
        reason: "Rights concern",
        isHidden: true,
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
      `https://api.example.test/api/wiki/image/${imageId}/request-deletion`,
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "session=abc",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }),
    );
  });

  it("returns backend errors without exposing the backend body", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ message: "Internal backend path /var/app" }, 409),
      ),
    );

    const response = await POST(createRequest(), createContext());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Wiki images are temporarily unavailable. Please try again later.");
    expect(body.message).not.toContain("/var/app");
    expect(consoleError).toHaveBeenCalledWith(
      "Wiki image deletion request backend request failed",
      { status: 409 },
    );
  });

  it("returns 502 when the backend response does not match the schema", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true })));

    const response = await POST(createRequest(), createContext());

    expect(response.status).toBe(502);
  });

  it("returns 500 when the backend base URL is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest(), createContext());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Wiki image API is not configured.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

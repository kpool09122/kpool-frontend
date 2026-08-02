import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const accountId = "22222222-2222-2222-2222-222222222222";
const documentsResponse = {
  documents: [
    {
      documentType: "passport",
      documentPath: "accounts/documents/passport.pdf",
      uploadedAt: "2026-08-02T00:00:00Z",
    },
  ],
};
const context = { params: Promise.resolve({ accountId }) };

const createRequest = (
  method: "GET" | "POST" = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): NextRequest =>
  new Request(`https://app.example.test/api/account/accounts/${accountId}/documents`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as NextRequest;

describe("/api/account/accounts/[accountId]/documents route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards POST document uploads without logging or exposing payloads", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(documentsResponse)));
    vi.stubGlobal("fetch", fetchMock);
    const requestBody = { documents: [{ documentType: "passport", fileContents: "YWJj" }] };

    const response = await POST(createRequest("POST", requestBody, {
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }), context);

    await expect(response.json()).resolves.toEqual(documentsResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.example.test/api/account/accounts/22222222-2222-2222-2222-222222222222/documents",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      },
    );
  });

  it("rejects oversized upload payloads before calling upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest("POST", { documents: [] }, {
      "content-length": String(16 * 1024 * 1024),
    }), context);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.message).toBe("Account document upload payload is too large.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose upstream 500 details to the client", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "failed with base64 payload abc at internal.account.example.test" }), { status: 500 }),
    ));

    const response = await POST(createRequest("POST", { documents: [] }), context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Account API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.account.example.test");
    expect(body.message).not.toContain("abc");
  });

  it("returns 502 when upstream response schema is invalid", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ documents: [{ documentType: "passport" }] }))));

    const response = await POST(createRequest("POST", { documents: [] }), context);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Account API response did not match the expected schema.");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

const documentsResponse = {
  documents: [
    {
      documentType: "passport",
      documentPath: "accounts/documents/passport.pdf",
      uploadedAt: "2026-08-02T00:00:00Z",
    },
  ],
};

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/account/my/documents", { headers }) as NextRequest;

describe("/api/account/my/documents route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards GET with Cookie and Accept-Language headers", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(documentsResponse)));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest({
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.example.test/api/account/my/documents",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "laravel_session=abc",
        },
        cache: "no-store",
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(documentsResponse);
  });

  it("does not expose upstream 500 details to the client", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "failed at internal.account.example.test" }), { status: 500 }),
    ));

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Account API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.account.example.test");
  });

  it("returns 502 when upstream response schema is invalid", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ documents: [{ documentType: "passport" }] }))));

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Account API response did not match the expected schema.");
  });
});

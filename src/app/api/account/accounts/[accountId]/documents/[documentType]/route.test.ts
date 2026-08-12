import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

type RouteContext = { params: Promise<{ accountId: string; documentType: string }> };

const createRequest = (download = false): NextRequest =>
  new Request(`https://app.example.test/api/account/accounts/44444444-4444-4444-8444-444444444444/documents/passport${download ? "?download=1" : ""}`, {
    headers: { "accept-language": "ja", cookie: "session=abc" },
  }) as NextRequest;

const context: RouteContext = {
  params: Promise.resolve({
    accountId: "44444444-4444-4444-8444-444444444444",
    documentType: "passport",
  }),
};

describe("/api/account/accounts/[accountId]/documents/[documentType] route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("streams account document files and forwards private headers", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response("pdf", {
      status: 200,
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": "inline; filename=passport.pdf",
        "content-type": "application/pdf",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest(true), context);

    expect(fetchMock).toHaveBeenCalledWith("https://account.example.test/api/account/accounts/44444444-4444-4444-8444-444444444444/documents/passport", {
      method: "GET",
      headers: { Accept: "application/json", "Accept-Language": "ja", Cookie: "session=abc" },
      cache: "no-store",
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toBe("attachment; filename=passport.pdf");
    await expect(response.text()).resolves.toBe("pdf");
  });

  it("preserves backend error status without parsing as a file", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "forbidden" }), { status: 403 })));

    const response = await GET(createRequest(), context);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "forbidden" });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { GET } from "./route";

const documentType = "representative_id";
const context = { params: Promise.resolve({ documentType }) };

const createRequest = (headers: Record<string, string> = {}, query = ""): NextRequest =>
  new Request(`https://app.example.test/api/account/my/documents/${documentType}${query}`, {
    headers,
  }) as NextRequest;

describe("/api/account/my/documents/[documentType] route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("streams the authenticated account document from upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test/api/account");
    const fetchMock = vi.fn().mockResolvedValue(new Response("image-bytes", {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": 'inline; filename="representative_id.jpg"',
        "content-type": "image/jpeg",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest({
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }), context);

    await expect(response.text()).resolves.toBe("image-bytes");
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.example.test/api/account/my/documents/representative_id",
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
  });

  it("returns sanitized upstream errors as json", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test/api/account");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: "Account document not found.",
    }), { status: 404 })));

    const response = await GET(createRequest(), context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Account document not found.");
  });

  it("returns attachment disposition for authenticated downloads", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test/api/account");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("pdf-bytes", {
      headers: {
        "content-disposition": 'inline; filename="representative_id.pdf"',
        "content-type": "application/pdf",
      },
    })));

    const response = await GET(createRequest({}, "?download=1"), context);

    expect(response.headers.get("content-disposition")).toBe('attachment; filename="representative_id.pdf"');
  });
});

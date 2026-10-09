import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const createRequest = (body: unknown): NextRequest => new Request(
  "https://app.example.test/api/account/accounts/setup",
  {
    method: "POST",
    headers: {
      "accept-language": "ja",
      "content-type": "application/json",
      cookie: "laravel_session=abc",
    },
    body: JSON.stringify(body),
  },
) as NextRequest;

describe("POST /api/account/accounts/setup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the validated selection, cookie, and language", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test/");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ accountType: "corporation" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.example.test/api/v1/account/accounts/setup",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify({ accountType: "corporation" }),
        cache: "no-store",
      },
    );
    expect(response.status).toBe(204);
  });

  it("rejects an invalid account type without calling upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ accountType: "agency" }));

    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403, 409, 422])("preserves status and Problem Details code for %s", async (status) => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: "setup required",
      code: "account_setup_required",
    }), { status })));

    const response = await POST(createRequest({ accountType: "individual" }));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      message: "setup required",
      code: "account_setup_required",
    });
  });

  it("hides upstream 5xx details while retaining a safe code", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: "database failure",
      code: "temporary_failure",
    }), { status: 500 })));

    const response = await POST(createRequest({ accountType: "individual" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Account API is temporarily unavailable.",
      code: "temporary_failure",
    });
  });
});

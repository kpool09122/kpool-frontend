import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/identity/auth/logout", {
    method: "POST",
    headers,
  }) as NextRequest;

describe("/api/identity/auth/logout route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards cookies to the upstream logout endpoint", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({})));
    vi.stubGlobal("fetch", fetchMock);

    await POST(createRequest({ cookie: "laravel_session=abc" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/api/identity/auth/logout",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: "laravel_session=abc",
        },
        cache: "no-store",
      },
    );
  });

  it("does not expose internal fetch errors to the client", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://internal.identity.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new Error("socket hang up internal.identity.example.test"),
      ),
    );

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Identity API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.identity.example.test");
  });
});

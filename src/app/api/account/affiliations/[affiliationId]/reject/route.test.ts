import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const affiliationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const createRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/account/affiliations/${affiliationId}/reject`, { method: "POST", headers }) as NextRequest;

describe("/api/account/affiliations/[affiliationId]/reject route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards reject requests and preserves no-content status", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ cookie: "laravel_session=abc" }), { params: Promise.resolve({ affiliationId }) });

    expect(fetchMock).toHaveBeenCalledWith(`https://account.example.test/api/account/affiliations/${affiliationId}/reject`, {
      method: "POST",
      headers: { Accept: "application/json", Cookie: "laravel_session=abc" },
      cache: "no-store",
    });
    expect(response.status).toBe(204);
  });
});

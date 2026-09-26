import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

describe("send auth code route", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("forwards the generated request contract and session headers", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "Set-Cookie": "verification=state; Path=/" } }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("https://app.example.test/api/identity/auth/send-auth-code", {
      method: "POST", headers: { "Content-Type": "application/json", "Accept-Language": "en", Cookie: "laravel_session=abc" },
      body: JSON.stringify({ email: "member@example.com" }),
    }) as NextRequest;

    const response = await POST(request);
    expect(fetchMock).toHaveBeenCalledWith("https://identity.example.test/api/identity/auth/send-auth-code", expect.objectContaining({
      body: JSON.stringify({ email: "member@example.com" }), cache: "no-store",
      headers: expect.objectContaining({ "Accept-Language": "en", Cookie: "laravel_session=abc" }),
    }));
    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe("");
    expect(response.headers.get("set-cookie")).toContain("verification=state");
  });
});

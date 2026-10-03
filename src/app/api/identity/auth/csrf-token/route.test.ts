import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("CSRF initialization route", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("forwards the session and returns both cookies without caching", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example.test");
    const headers = new Headers();
    headers.append("Set-Cookie", "laravel_session=session; Path=/; HttpOnly");
    headers.append("Set-Cookie", "XSRF-TOKEN=encrypted; Path=/");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("https://app.example.test/api/identity/auth/csrf-token", {
      headers: { Cookie: "laravel_session=existing", "Accept-Language": "ja" },
    }));
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://backend.example.test/api/identity/auth/csrf-token", {
      headers: { Accept: "application/json", "Accept-Language": "ja", Cookie: "laravel_session=existing" }, cache: "no-store",
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.getSetCookie()).toEqual(headers.getSetCookie());
    expect(await response.text()).toBe("");
  });

  it("preserves upstream failures", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://backend.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Unavailable" }), { status: 500 })));
    const response = await GET(new NextRequest("https://app.example.test/api/identity/auth/csrf-token"));
    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

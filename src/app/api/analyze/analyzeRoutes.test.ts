import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./principal/me/route";
import { POST } from "./principals/route";
const principal = {
  principalIdentifier: "11111111-1111-4111-8111-111111111111",
  identityIdentifier: "22222222-2222-4222-8222-222222222222",
  status: "active",
  policies: [],
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Analyze BFF", () => {
  it.each([
    [GET, "GET", "/principal/me", 200],
    [POST, "POST", "/principals", 201],
  ] as const)(
    "forwards %s with generated schema and cookies",
    async (handler, method, path, status) => {
      vi.stubEnv("KPOOL_ANALYZE_API_BASE_URL", "https://backend.test/");
      const fetch = vi
        .fn()
        .mockResolvedValue(
          Response.json(principal, {
            status,
            headers: { "set-cookie": "session=rotated; HttpOnly" },
          }),
        );
      vi.stubGlobal("fetch", fetch);
      const result = await handler(
        new NextRequest(`https://frontend.test/api/analyze${path}`, {
          method,
          headers: {
            cookie: "session=original",
            "accept-language": "ja",
            "x-xsrf-token": "csrf",
          },
        }),
      );
      expect(fetch).toHaveBeenCalledWith(
        `https://backend.test/api/v1/analyze${path}`,
        expect.objectContaining({
          method,
          cache: "no-store",
          headers: expect.objectContaining({
            Cookie: "session=original",
            "Accept-Language": "ja",
            "X-XSRF-TOKEN": "csrf",
          }),
        }),
      );
      expect(result.status).toBe(status);
      expect(await result.json()).toMatchObject({
        principalIdentifier: principal.principalIdentifier,
      });
      expect(result.headers.get("set-cookie")).toContain("session=rotated");
      expect(result.headers.get("cache-control")).toBe("no-store");
    },
  );
  it.each([401, 403, 404, 409, 429, 500, 503])(
    "preserves status %i but masks upstream internals",
    async (status) => {
      vi.stubEnv(
        "KPOOL_ANALYZE_API_BASE_URL",
        "https://backend.test/api/v1/analyze",
      );
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json(
              { message: "secret trace", exception: "internal" },
              { status },
            ),
          ),
      );
      const result = await GET(
        new NextRequest("https://frontend.test/api/analyze/principal/me"),
      );
      expect(result.status).toBe(status);
      expect(JSON.stringify(await result.json())).not.toContain("secret");
    },
  );
  it.each([{}, "invalid json"])(
    "rejects invalid success and preserves cookies",
    async (body) => {
      vi.stubEnv("KPOOL_ANALYZE_API_BASE_URL", "https://backend.test");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              typeof body === "string" ? body : JSON.stringify(body),
              { headers: { "set-cookie": "session=rotated" } },
            ),
          ),
      );
      const result = await GET(
        new NextRequest("https://frontend.test/api/analyze/principal/me"),
      );
      expect(result.status).toBe(502);
      expect(result.headers.get("set-cookie")).toContain("session=rotated");
    },
  );
  it("fails closed without configuration or upstream", async () => {
    vi.stubEnv("KPOOL_ANALYZE_API_BASE_URL", "");
    expect(
      (
        await GET(
          new NextRequest("https://frontend.test/api/analyze/principal/me"),
        )
      ).status,
    ).toBe(503);
    vi.stubEnv("KPOOL_ANALYZE_API_BASE_URL", "https://backend.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network secret")),
    );
    expect(
      (
        await GET(
          new NextRequest("https://frontend.test/api/analyze/principal/me"),
        )
      ).status,
    ).toBe(502);
  });
});

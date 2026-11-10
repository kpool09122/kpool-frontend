import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as app } from "./app/daily-summary/route";
import { GET as wiki } from "./wiki/daily-summary/route";
const metric = {
  comparison: null,
  definition: { source: "test", metric: "count", grain: "day", version: "1" },
  revision: null,
  days: [],
  total: null,
  denominator: null,
  actorCount: null,
  countries: [],
};
const appReport = { applicationUsers: metric, registeredUsers: metric };
const wikiReport = {
  views: metric,
  viewers: metric,
  engagementTime: metric,
  submissions: metric,
  publications: metric,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Analyze report BFF", () => {
  it.each([
    [app, "app", appReport],
    [wiki, "wiki", wikiReport],
  ] as const)(
    "forwards each generated report and only its allowed query",
    async (get, kind, data) => {
      vi.stubEnv("KPOOL_ANALYZE_API_BASE_URL", "https://backend.test/");
      const fetch = vi
        .fn()
        .mockResolvedValue(
          Response.json(data, { headers: { "set-cookie": "session=rotated" } }),
        );
      vi.stubGlobal("fetch", fetch);
      const result = await get(
        new NextRequest(
          `https://frontend.test/api/analyze/${kind}/daily-summary?from=2000-01-01&to=2000-06-30&translationSetIdentifier=abc&language=ja&country=unknown&identity=secret`,
          { headers: { cookie: "session=original", "accept-language": "ja" } },
        ),
      );
      const url = new URL(fetch.mock.calls[0][0]);
      expect(url.pathname).toBe(`/api/v1/analyze/${kind}/daily-summary`);
      expect(url.searchParams.get("from")).toBe("2000-01-01");
      expect(url.searchParams.get("identity")).toBeNull();
      expect(url.searchParams.get("language")).toBe(
        kind === "wiki" ? "ja" : null,
      );
      expect(url.searchParams.get("country")).toBe(
        "unknown",
      );
      expect(fetch.mock.calls[0][1]).toMatchObject({
        cache: "no-store",
        headers: { Cookie: "session=original", "Accept-Language": "ja" },
      });
      expect(result.status).toBe(200);
      expect(await result.json()).toEqual(data);
      expect(result.headers.get("set-cookie")).toContain("session=rotated");
      expect(result.headers.get("cache-control")).toBe("no-store");
    },
  );
  it.each([app, wiki])(
    "masks errors and rejects invalid contracts without losing rotated cookies",
    async (get) => {
      vi.stubEnv(
        "KPOOL_ANALYZE_API_BASE_URL",
        "https://backend.test/api/v1/analyze",
      );
      for (const status of [400, 401, 403, 422, 429, 500, 503, 200]) {
        vi.stubGlobal(
          "fetch",
          vi
            .fn()
            .mockResolvedValue(
              Response.json(
                { trace: "secret" },
                { status, headers: { "set-cookie": "session=rotated" } },
              ),
            ),
        );
        const result = await get(
          new NextRequest(
            "https://frontend.test/api/analyze/report?from=x&to=y",
          ),
        );
        expect(result.status).toBe(status === 200 ? 502 : status);
        expect(JSON.stringify(await result.json())).not.toContain("secret");
        expect(result.headers.get("set-cookie")).toContain("session=rotated");
      }
    },
  );
});

import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { forwardAnalyzePrincipal } from "./analyzeRouteSupport";
import {
  appReport,
  wikiReport,
} from "../../../../tests/fixtures/analyzeReports";
import { regionalize } from "../../../../tests/fixtures/analyzeRegionalReports";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it.each(["app", "wiki"] as const)(
  "forwards only generated %s regional parameters and validates the regional response",
  async (kind) => {
    vi.stubEnv("KPOOL_ANALYZE_API_BASE_URL", "https://backend.test");
    const report = regionalize(kind === "app" ? appReport : wikiReport);
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(report, { headers: { "set-cookie": "s=rotated" } }),
      );
    vi.stubGlobal("fetch", fetch);
    const result = await forwardAnalyzePrincipal(
      new NextRequest(
        "https://front.test/api?from=2026-01-01&to=2026-01-02&country=JP&region=JP-13&language=ko&wikiIdentifier=wiki&translationSetIdentifier=set&accountIdentifier=evil",
        { headers: { cookie: "s=original", "accept-language": "ko" } },
      ),
      "get",
      `/${kind}/regional-daily-summary`,
    );
    const forwarded = new URL(fetch.mock.calls[0][0]);
    expect(forwarded.pathname).toBe(
      `/api/v1/analyze/${kind}/regional-daily-summary`,
    );
    expect(Object.fromEntries(forwarded.searchParams)).toEqual({
      from: "2026-01-01",
      to: "2026-01-02",
      country: "JP",
      region: "JP-13",
      ...(kind === "wiki"
        ? {
            language: "ko",
            wikiIdentifier: "wiki",
            translationSetIdentifier: "set",
          }
        : {}),
    });
    expect(fetch.mock.calls[0][1]).toMatchObject({
      cache: "no-store",
      headers: { Cookie: "s=original", "Accept-Language": "ko" },
    });
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(report);
    expect(result.headers.get("set-cookie")).toBe("s=rotated");
  },
);
it.each([401, 403, 422, 500, "invalid-json", "invalid-schema"])(
  "masks regional upstream %s and preserves rotating cookies",
  async (status) => {
    vi.stubEnv("KPOOL_ANALYZE_API_BASE_URL", "https://backend.test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            status === "invalid-json"
              ? "{"
              : JSON.stringify({ exception: "secret" }),
            {
              status: typeof status === "number" ? status : 200,
              headers: { "set-cookie": "s=rotated" },
            },
          ),
        ),
    );
    const result = await forwardAnalyzePrincipal(
      new NextRequest("https://front.test/api?country=JP"),
      "get",
      "/app/regional-daily-summary",
    );
    expect(result.status).toBe(typeof status === "number" ? status : 502);
    expect(JSON.stringify(await result.json())).not.toContain("secret");
    expect(result.headers.get("set-cookie")).toBe("s=rotated");
  },
);

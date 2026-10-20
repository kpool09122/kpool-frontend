import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
const input = {
  title: "Edited",
  resourceType: "group",
  language: "ko",
  relatedWikis: [],
};
const site = {
  siteName: "Wikimedia",
  pageUrl: "https://commons.wikimedia.org/wiki/File:A.jpg",
  reason: "A",
  usageEvidence: "CC",
  usageEvidenceUrl: "https://commons.wikimedia.org/wiki/Commons:Licensing",
};
const request = (body: unknown = input) =>
  new NextRequest("https://app.test/api/wiki/images/search-free-materials", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Cookie: "session=private",
      "Accept-Language": "ko",
      "X-XSRF-TOKEN": "csrf",
      "Content-Type": "application/json",
    },
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("material search BFF", () => {
  it("rejects malformed request JSON without contacting the backend", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.test");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(
      new NextRequest(
        "https://app.test/api/wiki/images/search-free-materials",
        { method: "POST", body: "{bad" },
      ),
    );
    expect(response.status).toBe(422);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards authenticated context and CSRF, returns only contract fields with no-store and cookies", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.test");
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { sites: [{ ...site, secret: "no" }], trace: "no" },
          { headers: { "Set-Cookie": "session=rotated; HttpOnly" } },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request());
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/api/v1/wiki/images/search-free-materials",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify(input),
      }),
    );
    const headers = new Headers(fetcher.mock.calls[0][1].headers);
    expect(headers.get("cookie")).toBe("session=private");
    expect(headers.get("accept-language")).toBe("ko");
    expect(headers.get("x-xsrf-token")).toBe("csrf");
    expect(await response.json()).toEqual({ sites: [site] });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.getSetCookie()).toEqual([
      "session=rotated; HttpOnly",
    ]);
  });
  it.each([401, 403, 419, 422, 429, 500, 503])(
    "preserves %i while masking backend details",
    async (status) => {
      vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.test");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ detail: "secret", trace: "stack" }, { status }),
          ),
      );
      const response = await POST(request());
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toMatch(/secret|stack/);
    },
  );
  it.each([
    { ...input, title: " " },
    { ...input, language: "xx" },
    { ...input, relatedWikis: [{}] },
  ])("rejects invalid request without contacting upstream", async (body) => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.test");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await POST(request(body))).status).toBe(422);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { sites: [{ ...site, pageUrl: "javascript:alert(1)" }] },
    { sites: Array(4).fill(site) },
    { sites: [site, site] },
    { sites: [{}] },
  ])(
    "rejects unsafe or malformed responses and retains cookie rotation",
    async (body) => {
      vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.test");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          Response.json(body, {
            headers: { "Set-Cookie": "session=rotated" },
          }),
        ),
      );
      const response = await POST(request());
      expect(response.status).toBe(502);
      expect(response.headers.getSetCookie()).toEqual(["session=rotated"]);
    },
  );
  it("returns empty sites as a success and reports unconfigured or unavailable API", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "");
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://api.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ sites: [] })),
    );
    expect(await (await POST(request())).json()).toEqual({ sites: [] });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret")));
    expect((await POST(request())).status).toBe(502);
  });
});

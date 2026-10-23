import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const body = {
  resourceType: "group",
  wikiIdentifier: "11111111-1111-4111-8111-111111111111",
  url: "https://www.youtube.com/watch?v=Os_heh8vPfs&list=ignored",
  title: "Video",
  videoUsage: "music_video",
  displayOrder: 0,
  durationSeconds: 123,
};
const request = (payload: unknown = body, headers = {}) =>
  new NextRequest("http://localhost/api/wiki/videos/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "session=old",
      "X-XSRF-TOKEN": "csrf",
      "Accept-Language": "ja",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("single video create BFF", () => {
  it("rejects cross-origin and malformed JSON input before upstream fetch", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await POST(request(body, { Origin: "https://evil.example" }))).status,
    ).toBe(403);
    const invalid = new NextRequest("http://localhost/api/wiki/videos/create", {
      method: "POST",
      headers: { Cookie: "session=x", "X-XSRF-TOKEN": "token" },
      body: "not json",
    });
    expect((await POST(invalid)).status).toBe(422);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards one normalized video, session/language/CSRF; strips spoofed creator and preserves rotated cookies", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { "set-cookie": "session=new; HttpOnly" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(
      request({
        ...body,
        principalIdentifier: "spoofed",
        creatorName: "spoofed",
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("session=new");
    expect(fetcher).toHaveBeenCalledWith(
      "https://backend.example/api/v1/wiki/video-link/create",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          Cookie: "session=old",
          "Accept-Language": "ja",
          "X-XSRF-TOKEN": "csrf",
        }),
      }),
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      ...body,
      url: "https://www.youtube.com/watch?v=Os_heh8vPfs",
    });
  });
  it.each([401, 403, 404, 409, 419, 422, 429, 500, 503])(
    "preserves %i without leaking internal errors",
    async (status) => {
      vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json(
              { message: "SQL password", exception: "trace" },
              { status, headers: { "set-cookie": "session=new" } },
            ),
          ),
      );
      const response = await POST(request());
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toMatch(
        /SQL|password|trace/,
      );
      expect(response.headers.get("set-cookie")).toContain("session=new");
    },
  );
  it.each([
    { ...body, durationSeconds: -1 },
    { ...body, durationSeconds: 1.5 },
    { ...body, durationSeconds: 2147483648 },
    { ...body, url: "https://evil.test/Os_heh8vPfs" },
    { ...body, title: "" },
    { ...body, displayOrder: -1 },
    { videoLinks: [body] },
  ])(
    "rejects invalid one-video input before upstream fetch",
    async (payload) => {
      vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      expect((await POST(request(payload))).status).toBe(422);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("requires cookie and CSRF intent before upstream I/O", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await POST(request(body, { Cookie: "" }))).status).toBe(401);
    expect((await POST(request(body, { "X-XSRF-TOKEN": "" }))).status).toBe(
      403,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("masks transport failure and handles missing configuration", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "");
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret")));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});

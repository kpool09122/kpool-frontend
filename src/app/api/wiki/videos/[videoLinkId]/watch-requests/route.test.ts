import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
const id = "00000000-0000-4000-8000-000000000001";
const request = (headers = {}) =>
  new NextRequest(`http://localhost/api/wiki/videos/${id}`, {
    method: "POST",
    headers: {
      Cookie: "session=old",
      "X-XSRF-TOKEN": "csrf",
      "Accept-Language": "ja",
      ...headers,
    },
  });
const run = (headers = {}, videoLinkId = id) =>
  POST(request(headers), { params: Promise.resolve({ videoLinkId }) });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("video watch request BFF", () => {
  it("forwards POST for adding a like", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await POST(request(), { params: Promise.resolve({ videoLinkId: id }) }))
        .status,
    ).toBe(204);
    expect(fetcher.mock.calls[0][1].method).toBe("POST");
  });
  it("requires session, CSRF, same origin and UUID before upstream I/O", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await run({ Cookie: "" })).status).toBe(401);
    expect((await run({ "X-XSRF-TOKEN": "" })).status).toBe(403);
    expect((await run({ Origin: "https://evil.example" })).status).toBe(403);
    expect((await run({}, "../create")).status).toBe(422);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards authenticated DELETE without creator input and preserves 204/cookies", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { "set-cookie": "session=new; HttpOnly" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const response = await run();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("set-cookie")).toContain("session=new");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(fetcher).toHaveBeenCalledWith(
      `https://backend.example/api/v1/wiki/video-link/${id}/watch-requests`,
      {
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          Cookie: "session=old",
          "X-XSRF-TOKEN": "csrf",
          "Accept-Language": "ja",
        }),
      },
    );
  });
  it.each([401, 403, 404, 409, 419, 422, 429, 500, 503])(
    "preserves %i but masks errors and forwards rotated cookies",
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
      const response = await run();
      expect(response.status).toBe(status);
      expect(await response.text()).not.toMatch(/SQL|password|trace/);
      expect(response.headers.get("set-cookie")).toContain("session=new");
    },
  );
  it("rejects unexpected success, transport error and missing configuration", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "");
    expect((await run()).status).toBe(503);
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
    expect((await run()).status).toBe(502);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret")));
    expect((await run()).status).toBe(502);
  });
});

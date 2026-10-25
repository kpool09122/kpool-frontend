import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
const id = "00000000-0000-4000-8000-000000000001";
const run = (query = `videoLinkIds[]=${id}`, cookie = "session=old") =>
  GET(
    new NextRequest(`http://localhost/api/wiki/videos/likes?${query}`, {
      headers: { Cookie: cookie, "Accept-Language": "ko" },
    }),
  );
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("my video likes BFF", () => {
  it("validates authentication and batch size before I/O", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await run(undefined, "")).status).toBe(401);
    for (const query of [
      "",
      "videoLinkIds[]=bad",
      Array.from({ length: 101 }, () => `videoLinkIds[]=${id}`).join("&"),
    ])
      expect((await run(query)).status).toBe(422);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards only IDs, cookies and locale and returns a private schema-validated result", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          {
            likedVideoLinkIdentifiers: [id],
            videos: [],
            pagination: null,
            secret: "hidden",
          },
          { headers: { "Set-Cookie": "session=new" } },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const response = await run(
      `videoLinkIds[]=${id}&principalIdentifier=other`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ likedVideoLinkIdentifiers: [id] });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toContain("session=new");
    expect(fetcher.mock.calls[0][0]).toBe(
      `https://backend.example/api/v1/wiki/my/video-link-likes?videoLinkIds%5B%5D=${id}`,
    );
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      cache: "no-store",
      headers: expect.objectContaining({
        Cookie: "session=old",
        "Accept-Language": "ko",
      }),
    });
  });
  it.each([401, 403, 404, 422, 500])(
    "masks upstream %i and preserves cookies",
    async (status) => {
      vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json(
              { message: "SQL secret" },
              { status, headers: { "Set-Cookie": "session=new" } },
            ),
          ),
      );
      const response = await run();
      expect(response.status).toBe(status);
      expect(await response.text()).not.toContain("secret");
      expect(response.headers.get("set-cookie")).toContain("session=new");
    },
  );
  it("keeps rotated cookies even on invalid JSON/schema", async () => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    for (const body of [
      "bad json",
      "{}",
      JSON.stringify({ likedVideoLinkIdentifiers: [id] }),
      JSON.stringify({
        likedVideoLinkIdentifiers: [id],
        videos: [{ videoLinkIdentifier: id }],
        pagination: null,
      }),
    ]) {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(body, { headers: { "Set-Cookie": "session=new" } }),
          ),
      );
      const response = await run();
      expect(response.status).toBe(502);
      expect(response.headers.get("set-cookie")).toContain("session=new");
    }
  });
});

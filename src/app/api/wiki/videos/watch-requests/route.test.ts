import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";
const id = "00000000-0000-4000-8000-000000000001";
const req = (query = `videoLinkIds[]=${id}`, cookie = "session=old") =>
  new NextRequest(`http://localhost/api/wiki/videos/watch-requests?${query}`, {
    headers: { Cookie: cookie, "Accept-Language": "ko" },
  });
const state = {
  videoLinkIdentifier: id,
  sent: false,
  canSend: true,
  reason: null,
  lastSentAt: null,
  nextSendAt: null,
  remainingRequests: 3,
  unlikeRestrictedUntil: null,
  deleteRestrictedUntil: null,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("requires auth and explicit validated batch before upstream I/O", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await GET(req(undefined, ""))).status).toBe(401);
  for (const query of [
    "",
    "videoLinkIds[]=bad",
    new URLSearchParams(
      Array.from({ length: 101 }, () => ["videoLinkIds[]", id]),
    ).toString(),
  ])
    expect((await GET(req(query))).status).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
});
it("forwards cookie/language only to private API, strips unrequested states and internal extras", async () => {
  vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
  const fetcher = vi.fn().mockResolvedValue(
    Response.json(
      {
        videoWatchRequests: [
          { ...state, sender: "secret" },
          {
            ...state,
            videoLinkIdentifier: "00000000-0000-4000-8000-000000000002",
          },
        ],
        internal: "secret",
      },
      { headers: { "Set-Cookie": "session=rotated" } },
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await GET(req());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ videoWatchRequests: [state] });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("set-cookie")).toContain("session=rotated");
  expect(fetcher.mock.calls[0][0]).toContain("/my/video-watch-requests?");
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    cache: "no-store",
    headers: { Cookie: "session=old", "Accept-Language": "ko" },
  });
});
it.each([401, 403, 404, 422, 429, 500, 503])(
  "masks private error %i but preserves status and cookies",
  async (status) => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { exception: "secret", detail: "SQL" },
            { status, headers: { "Set-Cookie": "session=rotated" } },
          ),
        ),
    );
    const response = await GET(req());
    expect(response.status).toBe(status);
    expect(await response.text()).not.toMatch(/secret|SQL/);
    expect(response.headers.get("set-cookie")).toContain("session=rotated");
  },
);
it.each([
  "invalid json",
  JSON.stringify({ videoWatchRequests: [] }),
  JSON.stringify({ videoWatchRequests: [{ sent: true }] }),
])(
  "rejects malformed or incomplete snapshot retaining rotated cookies",
  async (body) => {
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "https://backend.example");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(body, { headers: { "Set-Cookie": "session=rotated" } }),
        ),
    );
    const response = await GET(req());
    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toContain("session=rotated");
  },
);

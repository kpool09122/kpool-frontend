import { afterEach, expect, it, vi } from "vitest";
import {
  fetchOfficialRequestVideos,
  fetchOfficialVideoWikis,
  officialVideoInboxPath,
} from "./officialVideoInbox";
afterEach(() => vi.unstubAllGlobals());
it("builds exact same-origin owner destinations", () => {
  expect(officialVideoInboxPath()).toBe("/admin/wiki/watch-requests");
  expect(officialVideoInboxPath("a/b")).toBe(
    "/admin/wiki/watch-requests/a%2Fb",
  );
});
it("forwards browser credentials, no-store and cancellation", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ wikis: [] }));
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  await expect(fetchOfficialVideoWikis(signal)).resolves.toEqual({ wikis: [] });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/wiki/my/watch-request-videos",
    expect.objectContaining({
      credentials: "include",
      cache: "no-store",
      signal,
    }),
  );
});
it.each([401, 403, 404, 500])(
  "preserves status %s but never arbitrary backend bodies",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ exception: "secret" }, { status })),
    );
    await expect(fetchOfficialRequestVideos("id")).rejects.toEqual({ status });
  },
);
it("validates the generated video response", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(Response.json({ videos: [{ title: "invalid" }] })),
  );
  await expect(fetchOfficialRequestVideos("id")).rejects.toEqual({
    status: 502,
  });
});

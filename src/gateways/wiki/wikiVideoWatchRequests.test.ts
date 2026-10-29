import { afterEach, expect, it, vi } from "vitest";
import {
  fetchWikiVideoWatchRequests,
  sendWikiVideoWatchRequest,
} from "./wikiVideoWatchRequests";
const id = "00000000-0000-4000-8000-000000000001";
afterEach(() => vi.unstubAllGlobals());
it("reads private server state with credentials, deduplicates IDs and rejects incomplete snapshots", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ videoWatchRequests: [] }));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    fetchWikiVideoWatchRequests([id, id], new AbortController().signal),
  ).rejects.toThrow();
  expect(fetcher.mock.calls[0][0]).toContain(encodeURIComponent(id));
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    credentials: "include",
    cache: "no-store",
  });
});
it("sends only the video identifier, never likes automatically, and retains conflict status without exposing backend details", async () => {
  document.cookie = "XSRF-TOKEN=test; path=/";
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ reason: "weekly_limit_reached" }, { status: 409 }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect(await sendWikiVideoWatchRequest(id)).toEqual({
    ok: false,
    status: 409,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    method: "POST",
    credentials: "include",
  });
});

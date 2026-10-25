import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWikiVideoLikes, setWikiVideoLiked } from "./wikiVideoLikes";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
afterEach(() => vi.unstubAllGlobals());
describe("video likes gateway", () => {
  it("forwards add/remove with an abort signal so session changes can stop a pending write", async () => {
    document.cookie = "XSRF-TOKEN=csrf; path=/";
    const controller = new AbortController();
    const fetcher = vi
      .fn()
      .mockImplementation(() => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await setWikiVideoLiked(id(1), true, controller.signal)).toEqual({
      ok: true,
      status: 204,
    });
    expect(await setWikiVideoLiked(id(1), false, controller.signal)).toEqual({
      ok: true,
      status: 204,
    });
    expect(fetcher.mock.calls.map((call) => call[1].method)).toEqual([
      "POST",
      "DELETE",
    ]);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: "include",
      signal: controller.signal,
      headers: expect.objectContaining({ "X-XSRF-TOKEN": "csrf" }),
    });
    expect(await setWikiVideoLiked("bad", true)).toEqual({
      ok: false,
      status: 422,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("splits 101 unique IDs into authenticated batches of at most 100", async () => {
    const fetcher = vi.fn().mockImplementation((url: string) =>
      Response.json({
        likedVideoLinkIdentifiers: new URL(
          url,
          "http://localhost",
        ).searchParams.getAll("videoLinkIds[]"),
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const ids = Array.from({ length: 101 }, (_, n) => id(n));
    expect(
      await fetchWikiVideoLikes([...ids, ids[0]], new AbortController().signal),
    ).toEqual(ids);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      new URL(fetcher.mock.calls[0][0], "http://localhost").searchParams.getAll(
        "videoLinkIds[]",
      ),
    ).toHaveLength(100);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: "include",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
  });
  it("fails closed on invalid schemas, errors and transport failure", async () => {
    for (const response of [
      Response.json({}),
      Response.json({ message: "secret" }, { status: 401 }),
      new Response("bad json"),
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      await expect(
        fetchWikiVideoLikes([id(1)], new AbortController().signal),
      ).rejects.toThrow("Video likes are unavailable.");
    }
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret")));
    expect(await setWikiVideoLiked(id(1), true)).toEqual({
      ok: false,
      status: 0,
    });
  });
});

import { afterEach, expect, it, vi } from "vitest";
import {
  playlistName,
  aggregateLikedVideos,
  savePlaylist,
  fetchPlaylist,
} from "./wikiPlaylists";
const id = "00000000-0000-4000-8000-000000000001";
afterEach(() => vi.unstubAllGlobals());
it("uses mb_trim and Unicode code points for Japanese and emoji boundaries", () => {
  for (const value of [
    "あ",
    "あ".repeat(32),
    "😀".repeat(32),
    "\u0085名前\u3000",
  ])
    expect(playlistName.safeParse(value).success).toBe(true);
  for (const value of ["", "\u0085\u3000", "😀".repeat(33)])
    expect(playlistName.safeParse(value).success).toBe(false);
  expect(playlistName.safeParse("\u0085名前\u3000").data).toBe("名前");
  expect(playlistName.safeParse("\u180e").success).toBe(false);
  expect(playlistName.safeParse("\u180e名前\u180e").data).toBe("名前");
});
it("aggregates pages by YouTube ID preserving the first representative source", () => {
  const video = {
    provider: "youtube" as const, externalVideoId: "abcdefghijk",
    videoLinkIdentifier: id,
    url: "https://youtu.be/abcdefghijk",
    title: "First",
    thumbnailUrl: null,
    durationSeconds: null,
    language: "ja" as const,
    resourceType: "group" as const,
    slug: "group",
    likedAt: "now",
    playlists: [],
  };
  expect(
    aggregateLikedVideos([
      video,
      {
        ...video,
        language: "ko",
        videoLinkIdentifier: "other",
        url: "https://www.youtube.com/watch?v=abcdefghijk",
      },
    ]),
  ).toEqual([{ ...video, externalVideoId: "abcdefghijk" }]);
});
it("saves mixed identity forms and accepts 204 without reading JSON", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetcher);
  const body = {
    name: "List",
    items: [
      { provider: "youtube" as const, externalVideoId: "abcdefghijk" },
      { videoLinkIdentifier: id },
    ],
  };
  expect(await savePlaylist(id, body)).toEqual({ ok: true, status: 204 });
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(body);
});
it("requires full saved detail including deleted-source snapshots", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          playlistIdentifier: id,
          name: "😀".repeat(32),
          videoCount: 1,
          createdAt: "2026-10-26T00:00:00Z",
          updatedAt: "2026-10-26T00:00:00Z",
          items: [
            {
              sourceVideoLinkIdentifier: null,
              provider: "youtube",
              externalVideoId: "abcdefghijk",
              position: 0,
              url: "https://youtu.be/abcdefghijk",
              title: "Snapshot",
              thumbnailUrl: null,
              durationSeconds: null,
            },
          ],
        }),
      ),
  );
  expect(
    (await fetchPlaylist(id, new AbortController().signal)).items[0]
      .sourceVideoLinkIdentifier,
  ).toBeNull();
});

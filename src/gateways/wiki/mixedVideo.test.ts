import { describe, expect, it } from "vitest";
import { wikiVideoCreateSchema } from "./wikiVideoCreateModel";
import { aggregateLikedVideos, playlistSaveSchema, type LikedVideo } from "./wikiPlaylists";
const id = "6718335390845095173";
const body = { resourceType: "talent", wikiIdentifier: "11111111-1111-4111-8111-111111111111", title: "Video", videoUsage: "short" };
describe("mixed-provider API boundaries", () => {
  it("accepts TikTok canonical and share URLs without browser metadata", () => {
    for (const url of [`https://www.tiktok.com/@scout2015/video/${id}`, "https://vm.tiktok.com/AbCd123/", "https://vt.tiktok.com/AbCd123/"]) expect(wikiVideoCreateSchema.safeParse({ ...body, url }).success).toBe(true);
  });
  it("requires YouTube duration but accepts zero", () => {
    const youtube = { ...body, url: "https://youtu.be/abcdefghijk" };
    expect(wikiVideoCreateSchema.safeParse(youtube).success).toBe(false);
    expect(wikiVideoCreateSchema.safeParse({ ...youtube, durationSeconds: 0 }).success).toBe(true);
  });
  it("aggregates by provider and authoritative string ID, not URL", () => {
    const video = { provider: "tiktok", externalVideoId: id, url: "https://vm.tiktok.com/AbCd123/" } as LikedVideo;
    expect(aggregateLikedVideos([video, { ...video, url: `https://www.tiktok.com/@other/video/${id}` }])).toEqual([video]);
  });
  it("rejects provider-ID mismatch on saved snapshots", () => {
    expect(playlistSaveSchema.safeParse({ name: "Mixed", items: [{ provider: "tiktok", externalVideoId: "abcdefghijk" }] }).success).toBe(false);
    expect(playlistSaveSchema.safeParse({ name: "Mixed", items: [{ provider: "tiktok", externalVideoId: id }] }).success).toBe(true);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createPlaybackStore } from "./playbackStore";

const tracks = [
  { identifier: "first", videoId: "abcdefghijk", title: "First" },
  { identifier: "second", videoId: "lmnopqrstuv", title: "Second" },
];

describe("shared playback ownership", () => {
  it.each(["youtube", "tiktok"] as const)("reports only actual completed playback once per completion token (%s)", (provider) => {
    const ended = vi.fn();
    const store = createPlaybackStore();
    const videoId = provider === "youtube" ? "abcdefghijk" : "6718335390845095173";
    store.getState().start("owner", [{ identifier: "first", videoId, provider, title: "First", onEnded: ended }, tracks[1]], "queue", "all");
    const session = store.getState().session!;
    store.getState().advance(session.id + 1, false, videoId, provider, 0);
    store.getState().advance(session.id, false, "stale-video", provider, 0);
    expect(ended).not.toHaveBeenCalled();
    store.getState().advance(session.id, false, videoId, provider, 0);
    store.getState().advance(session.id, false, videoId, provider, 0);
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it("does not report completion on skips, errors, stops or replacement", () => {
    const ended = vi.fn();
    const store = createPlaybackStore();
    const watchedTracks = tracks.map((track) => ({ ...track, onEnded: ended }));
    store.getState().start("owner", watchedTracks, "queue");
    let session = store.getState().session!;
    store.getState().selectTrack(session.id, "second");
    store.getState().advance(session.id, true, tracks[1].videoId, "youtube", 1);
    store.getState().start("owner", watchedTracks, "single");
    session = store.getState().session!;
    store.getState().stop();
    store.getState().advance(session.id, false, tracks[0].videoId, "youtube", 0);
    expect(ended).not.toHaveBeenCalled();
  });

  it.each(["off", "one", "all"] as const)("mixed queue skips every failed provider and stops even with loop %s", (loop) => {
    const store = createPlaybackStore();
    store.getState().start("mixed", [{ ...tracks[0], provider: "youtube" }, { ...tracks[1], provider: "tiktok", videoId: "6718335390845095173" }], "queue", loop, true);
    const session = store.getState().session!;
    const first = session.tracks[session.queue.playerIndex];
    store.getState().advance(session.id, true, first.videoId, first.provider, 0);
    const next = store.getState().session!;
    const second = next.tracks[next.queue.playerIndex];
    expect(second.provider).not.toBe(first.provider);
    store.getState().advance(session.id, true, second.videoId, second.provider, next.queue.sequence);
    expect(store.getState().session).toBeNull();
  });
  it("ignores duplicate and stale mixed-provider completion tokens including repeat-one", () => {
    const store = createPlaybackStore();
    store.getState().start("mixed", [{ ...tracks[0], provider: "youtube" }, { ...tracks[1], provider: "tiktok", videoId: "6718335390845095173" }], "queue", "all");
    const session = store.getState().session!;
    store.getState().advance(session.id, false, tracks[0].videoId, "youtube", 0);
    expect(store.getState().session?.queue.position).toBe(1);
    store.getState().advance(session.id, false, tracks[0].videoId, "youtube", 0);
    expect(store.getState().session?.queue.position).toBe(1);
    store.getState().setLoop("one");
    store.getState().advance(session.id, false, "6718335390845095173", "tiktok", 1);
    store.getState().advance(session.id, false, "6718335390845095173", "tiktok", 1);
    expect(store.getState().session?.queue.sequence).toBe(2);
    store.getState().selectTrack(session.id, "second");
    expect(store.getState().session?.queue.sequence).toBe(3);
  });
  it("restores only the current source without changing its track, queue or playback settings", () => {
    const store = createPlaybackStore();
    store.getState().restore("playlist");
    expect(store.getState().session).toBeNull();
    store.getState().start("playlist", tracks, "queue", "all", true);
    store.getState().advance(store.getState().session!.id);
    store.getState().detach();
    const session = store.getState().session;
    store.getState().restore("another-source");
    expect(store.getState().floating).toBe(true);
    store.getState().restore("playlist");
    expect(store.getState().floating).toBe(false);
    expect(store.getState().session).toBe(session);
    store.getState().release("playlist");
    expect(store.getState().session).toBeNull();
  });
  it("stops on source removal unless the user explicitly detached the player", () => {
    const store = createPlaybackStore();
    store.getState().start("wiki-a", tracks, "queue");
    store.getState().release("wiki-a");
    expect(store.getState().session).toBeNull();
    store.getState().start("wiki-a", tracks, "queue", "all");
    store.getState().detach();
    const id = store.getState().session!.id;
    store.getState().release("wiki-a");
    store.getState().advance(id);
    store.getState().advance(id);
    expect(store.getState().session?.queue.position).toBe(0);
    expect(store.getState().floating).toBe(true);
    store.getState().setLoop("off");
    store.getState().advance(id);
    store.getState().advance(id);
    expect(store.getState().session).toBeNull();
  });
  it("ignores cleanup and playback callbacks belonging to a replaced source", () => {
    const store = createPlaybackStore();
    store.getState().start("wiki-a", tracks, "queue");
    const oldId = store.getState().session!.id;
    store.getState().detach();
    store.getState().start("wiki-b", [tracks[1]], "single");
    store.getState().release("wiki-a");
    store.getState().advance(oldId, true);
    store.getState().unavailable(oldId);
    store.getState().synchronize(oldId, "12345678901");
    expect(store.getState().session?.owner).toBe("wiki-b");
    expect(store.getState().floating).toBe(true);
    expect(store.getState().notice).toBeNull();
  });
  it("starts inline again after the mini player is closed", () => {
    const store = createPlaybackStore();
    store.getState().start("wiki-a", tracks, "queue");
    store.getState().detach();
    store.getState().stop();
    store.getState().start("wiki-b", tracks, "queue");
    expect(store.getState().floating).toBe(false);
  });
});

describe("selecting a queued track", () => {
  it.each([false, true])("repeats the chosen track without changing order or position (shuffle: %s)", (random) => {
    const store = createPlaybackStore();
    store.getState().start("playlist", tracks, "queue", "one", random, "second");
    const initial = store.getState().session!;
    for (let sequence = 1; sequence <= 3; sequence++) {
      store.getState().advance(initial.id, false, tracks[1].videoId);
      expect(store.getState().session).toMatchObject({
        id: initial.id, loop: "one", random,
        queue: { order: initial.queue.order, position: initial.queue.position, playerIndex: 1, sequence },
      });
    }
    store.getState().selectTrack(initial.id, "first");
    store.getState().advance(initial.id);
    expect(store.getState().session?.queue.playerIndex).toBe(0);
    store.getState().setLoop("off");
    expect(store.getState().session?.loop).toBe("off");
  });
  it("skips failed tracks in repeat-one mode and stops when every track has failed", () => {
    const store = createPlaybackStore();
    store.getState().start("playlist", tracks, "queue", "one");
    const id = store.getState().session!.id;
    store.getState().advance(id, true);
    expect(store.getState().session?.queue).toMatchObject({ playerIndex: 1, failed: [0] });
    store.getState().advance(id, true);
    expect(store.getState().session).toBeNull();
  });
  it("starts at the chosen track and continues in playlist order", () => {
    const store = createPlaybackStore();
    store.getState().start("playlist", tracks, "queue", "all", false, "second");
    const session = store.getState().session!;
    expect(session.queue).toMatchObject({ order: [0, 1], position: 1, playerIndex: 1, sequence: 0 });
    store.getState().advance(session.id);
    expect(store.getState().session?.queue).toMatchObject({ position: 0, playerIndex: 0 });
  });
  it("plays the chosen track first when shuffle is enabled", () => {
    const store = createPlaybackStore();
    store.getState().start("playlist", tracks, "queue", "off", true, "second");
    const session = store.getState().session!;
    expect(session.queue).toMatchObject({ order: [1, 0], position: 0, playerIndex: 1 });
    store.getState().advance(session.id);
    expect(store.getState().session?.queue.playerIndex).toBe(0);
  });
  it("loads the selected track without replacing the session, order or playback settings", () => {
    const store = createPlaybackStore();
    store.getState().start("playlist", tracks, "queue", "all", true);
    const before = store.getState().session!;
    const index = before.queue.order[1];
    store.getState().selectTrack(before.id, tracks[index].identifier);
    expect(store.getState().session).toMatchObject({
      id: before.id, owner: before.owner, loop: "all", random: true,
      queue: { order: before.queue.order, position: 1, playerIndex: index, sequence: 1 },
    });
    expect(store.getState().floating).toBe(false);
  });
  it("ignores stale sessions, unknown tracks and single-video playback", () => {
    const store = createPlaybackStore();
    store.getState().start("playlist", tracks, "queue");
    const before = store.getState().session!;
    store.getState().selectTrack(before.id - 1, "second");
    store.getState().selectTrack(before.id, "missing");
    expect(store.getState().session).toBe(before);
    store.getState().start("wiki", tracks, "single");
    const single = store.getState().session!;
    store.getState().selectTrack(single.id, "second");
    expect(store.getState().session).toBe(single);
  });
  it("allows retrying a previously failed track and then continues from that position", () => {
    const store = createPlaybackStore();
    store.getState().start("playlist", tracks, "queue", "all");
    const id = store.getState().session!.id;
    store.getState().advance(id, true);
    expect(store.getState().session?.queue.failed).toEqual([0]);
    store.getState().selectTrack(id, "first");
    expect(store.getState().session?.queue).toMatchObject({ position: 0, playerIndex: 0, sequence: 2, failed: [] });
    expect(store.getState().notice).toBeNull();
    store.getState().advance(id);
    expect(store.getState().session?.queue).toMatchObject({ position: 1, playerIndex: 1 });
  });
});

import { describe, expect, it } from "vitest";
import { createPlaybackStore } from "./playbackStore";

const tracks = [
  { identifier: "first", videoId: "abcdefghijk", title: "First" },
  { identifier: "second", videoId: "lmnopqrstuv", title: "Second" },
];

describe("shared playback ownership", () => {
  it("stops on source removal unless the user explicitly detached the player", () => {
    const store = createPlaybackStore();
    store.getState().start("wiki-a", tracks, "queue");
    store.getState().release("wiki-a");
    expect(store.getState().session).toBeNull();
    store.getState().start("wiki-a", tracks, "queue", true);
    store.getState().detach();
    const id = store.getState().session!.id;
    store.getState().release("wiki-a");
    store.getState().advance(id);
    store.getState().advance(id);
    expect(store.getState().session?.queue.position).toBe(0);
    expect(store.getState().floating).toBe(true);
    store.getState().setLoop(false);
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

import { beforeEach, expect, it, vi } from "vitest";
import { createJsonStorage } from "@/gateways/support/jsonStorage";
import { createPlaybackStore } from "./playbackStore";
import { miniPlayerStorageKey, persistMiniPlayer } from "./playbackPersistence";

const tracks = [
  { identifier: "first", videoId: "abcdefghijk", title: "First", onEnded: vi.fn(), controls: "Page control" },
  { identifier: "second", videoId: "6718335390845095173", title: "Second", provider: "tiktok" as const },
  { identifier: "third", videoId: "lmnopqrstuv", title: "Third" },
];
const values = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};
const storage = createJsonStorage(() => localStorage);
beforeEach(() => values.clear());

it("persists only floating playback and restores the active video, order and settings after reload", () => {
  const store = createPlaybackStore();
  const connection = persistMiniPlayer(store, storage, () => null);
  store.getState().start("public", tracks, "queue", "all", true, "second");
  expect(localStorage.getItem(miniPlayerStorageKey)).toBeNull();
  store.getState().detach();
  store.getState().selectTrack(1, "third");
  store.getState().setLoop("one");
  const session = store.getState().session!;
  connection.dispose();

  const reloaded = createPlaybackStore();
  const restored = persistMiniPlayer(reloaded, storage, () => null);
  expect(reloaded.getState().floating).toBe(true);
  expect(reloaded.getState().session).toMatchObject({
    owner: "public", loop: "one", random: true,
    queue: { order: session.queue.order, position: session.queue.position, playerIndex: 2 },
  });
  expect(reloaded.getState().session!.tracks[0]).not.toHaveProperty("controls");
  expect(reloaded.getState().session!.tracks[0]).not.toHaveProperty("onEnded");
  reloaded.getState().advance(reloaded.getState().session!.id);
  expect(reloaded.getState().session!.queue.sequence).toBe(1);
  restored.dispose();
});

it.each(["stop", "restore", "end"])("removes the saved mini player on %s", (action) => {
  const store = createPlaybackStore();
  const connection = persistMiniPlayer(store, storage, () => null);
  store.getState().start("public", tracks.slice(0, 1), "queue");
  store.getState().detach();
  expect(localStorage.getItem(miniPlayerStorageKey)).not.toBeNull();
  if (action === "stop") store.getState().stop();
  else if (action === "restore") store.getState().restore("public");
  else store.getState().advance(1);
  expect(localStorage.getItem(miniPlayerStorageKey)).toBeNull();
  connection.dispose();
});

it.each(["same-account", "other-account", null])("waits for authentication and restores private playback only for the same scope (%s)", (scope) => {
  const store = createPlaybackStore();
  const connection = persistMiniPlayer(store, storage, () => "same-account");
  store.getState().start("private-playlist:owner:list", tracks, "queue");
  store.getState().detach();
  connection.dispose();

  let identity: string | null | undefined = undefined;
  const reloaded = createPlaybackStore();
  const restored = persistMiniPlayer(reloaded, storage, () => identity);
  expect(reloaded.getState().session).toBeNull();
  expect(localStorage.getItem(miniPlayerStorageKey)).not.toBeNull();
  identity = scope;
  restored.synchronizeAuth();
  expect(reloaded.getState().session !== null).toBe(scope === "same-account");
  expect(localStorage.getItem(miniPlayerStorageKey) !== null).toBe(scope === "same-account");
  restored.dispose();
});

it("does not replace playback started while authentication was pending", () => {
  const store = createPlaybackStore();
  const connection = persistMiniPlayer(store, storage, () => "account");
  store.getState().start("private-wiki-inbox:owner", tracks, "queue");
  store.getState().detach();
  connection.dispose();
  let scope: string | undefined = undefined;
  const reloaded = createPlaybackStore();
  const restored = persistMiniPlayer(reloaded, storage, () => scope);
  reloaded.getState().start("new-playback", tracks, "queue");
  scope = "account";
  restored.synchronizeAuth();
  expect(reloaded.getState().session!.owner).toBe("new-playback");
  expect(localStorage.getItem(miniPlayerStorageKey)).toBeNull();
  restored.dispose();
});

it.each(["{", "{}", "invalid-position", "invalid-index", "duplicate-order"])("ignores malformed storage (%s)", (invalid) => {
  const store = createPlaybackStore();
  const connection = persistMiniPlayer(store, storage, () => null);
  store.getState().start("public", tracks, "queue");
  store.getState().detach();
  connection.dispose();
  const snapshot = JSON.parse(localStorage.getItem(miniPlayerStorageKey)!);
  if (invalid === "invalid-position") snapshot.session.queue.position = 99;
  if (invalid === "invalid-index") snapshot.session.queue.order = [99];
  if (invalid === "duplicate-order") snapshot.session.queue.order = [0, 0];
  localStorage.setItem(miniPlayerStorageKey, invalid.startsWith("{") ? invalid : JSON.stringify(snapshot));
  const reloaded = createPlaybackStore();
  const restored = persistMiniPlayer(reloaded, storage, () => null);
  expect(reloaded.getState().session).toBeNull();
  expect(localStorage.getItem(miniPlayerStorageKey)).toBeNull();
  restored.dispose();
});

it("allows playback when browser storage is unavailable", () => {
  const store = createPlaybackStore();
  const unavailable = () => { throw new Error("Storage disabled"); };
  const connection = persistMiniPlayer(store, createJsonStorage(() => { unavailable(); return localStorage; }), () => null);
  expect(() => {
    store.getState().start("public", tracks, "queue");
    store.getState().detach();
    store.getState().stop();
  }).not.toThrow();
  connection.dispose();
});

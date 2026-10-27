import { expect, it } from "vitest";
import { createPlaybackStore } from "@/components/VideoPlayback/playbackStore";
import { reconcilePrivatePlayback } from "./privatePlaybackAccess";
it("clears private playback on Wiki Principal replacement or suspension, including floating notices", () => {
  const store = createPlaybackStore();
  store
    .getState()
    .start(
      "private-playlist:first:scope:list",
      [{ identifier: "one", videoId: "abcdefghijk", title: "Private" }],
      "queue",
    );
  store.getState().detach();
  reconcilePrivatePlayback(store, "first");
  expect(store.getState().session).not.toBeNull();
  reconcilePrivatePlayback(store, "second");
  expect(store.getState().session).toBeNull();
  store
    .getState()
    .start(
      "private-playlist:first:scope:list",
      [{ identifier: "one", videoId: "abcdefghijk", title: "Private" }],
      "queue",
    );
  store.getState().detach();
  store.getState().unavailable(store.getState().session!.id);
  reconcilePrivatePlayback(store, null);
  expect(store.getState().notice).toBeNull();
});

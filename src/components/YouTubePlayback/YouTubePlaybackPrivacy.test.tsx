import { act, render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  YouTubePlaybackProvider,
  useYouTubePlayback,
} from "./YouTubePlaybackProvider";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { PlaybackStore } from "./playbackStore";
import { useEffect } from "react";
import { dictionaries } from "@/i18n/dictionaries";
vi.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ dictionary: dictionaries.en }),
}));
vi.mock("./YouTubeQueuePlayer", () => ({ YouTubeQueuePlayer: () => null }));
let store: PlaybackStore;
function Capture() {
  const context = useYouTubePlayback()!;
  useEffect(() => {
    store = context.store;
  }, [context]);
  return null;
}
beforeEach(() =>
  useAuthStore.setState({
    status: "authenticated",
    identity: null,
    sessionVersion: 1,
  }),
);
it("stops floating private queues synchronously on logout but preserves public queues", () => {
  render(
    <YouTubePlaybackProvider>
      <Capture />
    </YouTubePlaybackProvider>,
  );
  act(() => {
    store
      .getState()
      .start(
        "private-playlist:owner",
        [{ identifier: "one", videoId: "abcdefghijk", title: "Private" }],
        "queue",
      );
    store.getState().detach();
  });
  act(() => useAuthStore.getState().clearIdentity());
  expect(store.getState().session).toBeNull();
  act(() =>
    store
      .getState()
      .start(
        "public",
        [{ identifier: "one", videoId: "abcdefghijk", title: "Public" }],
        "queue",
      ),
  );
  act(() => useAuthStore.getState().clearIdentity());
  expect(store.getState().session?.owner).toBe("public");
});

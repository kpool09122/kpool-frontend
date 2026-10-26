import type { PlaybackStore } from "@/components/YouTubePlayback/playbackStore";
export function reconcilePrivatePlayback(
  store: PlaybackStore,
  principal: string | null,
) {
  const state = store.getState();
  const owner = state.session?.owner ?? state.notice?.owner;
  if (
    owner?.startsWith("private-playlist:") &&
    (!principal || !owner.startsWith(`private-playlist:${principal}:`))
  )
    state.stop();
}

"use client";

import { useRef } from "react";
import { YouTubePlayer, type VideoPlaybackRequest, type VideoPlaybackState } from "./YouTubePlayer";

// The queue owns completion guards. YouTubePlayer owns
// the iframe and API connection, keeping both alive across video changes.
export function YouTubeQueuePlayer({
  videoId, playbackKey = videoId, expanded = false, title,
  onVideoChange, onEnded, onError, onUnavailable, startSeconds = 0, onProgress,
}: {
  videoId: string;
  playbackKey?: string | number;
  expanded?: boolean;
  title: string;
  startSeconds?: number;
  onProgress?: (seconds: number, videoId: string) => void;
  onVideoChange?: (videoId: string) => void;
  onEnded: (videoId?: string) => void;
  onError: () => void;
  onUnavailable: () => void;
}) {
  const playback = useRef<{
    loaded?: VideoPlaybackRequest;
    finished: boolean;
    awaitingPlayback: boolean;
    reportedVideoId?: string;
  }>({ finished: false, awaitingPlayback: true });
  const finish = (kind: "ended" | "error", id?: string) => {
    const current = playback.current;
    if (current.finished || current.loaded?.key !== playbackKey) return;
    if (kind === "ended" && current.awaitingPlayback) return;
    current.finished = true;
    if (kind === "ended") onEnded(id);
    else onError();
  };
  const onLoad = (request: VideoPlaybackRequest) => {
    const current = playback.current;
    current.loaded = request;
    current.finished = false;
    current.awaitingPlayback = true;
    current.reportedVideoId = request.videoId;
  };
  const onStateChange = ({ state, actualState, videoId: id }: VideoPlaybackState) => {
    const current = playback.current;
    if (current.finished || current.loaded?.key !== playbackKey) return;
    if (state === 0) {
      // A delayed ENDED event must not finish a video already playing.
      if (actualState !== undefined && actualState !== 0) return;
      finish("ended", id);
    } else if (state === 1) {
      // Loading can briefly leave the previous video's state visible.
      if (current.awaitingPlayback && id && id !== current.loaded?.videoId) return;
      current.awaitingPlayback = false;
      if (id && id !== current.reportedVideoId) {
        current.reportedVideoId = id;
        onVideoChange?.(id);
      }
    }
  };
  return (
    <div className={expanded ? "flex h-full min-h-0 flex-col gap-3" : "space-y-3"}>
      <YouTubePlayer videoId={videoId} playbackKey={playbackKey} title={title}
        startSeconds={startSeconds}
        onProgress={(seconds, id) => {
          const current = playback.current;
          if (!current.finished && !current.awaitingPlayback && current.loaded?.key === playbackKey) onProgress?.(seconds, id);
        }}
        className={expanded ? "min-h-0 w-full flex-1 overflow-hidden bg-black" : "aspect-video w-full overflow-hidden rounded-xl bg-surface-muted"}
        onLoad={onLoad} onStateChange={onStateChange} onError={() => finish("error")}
        onUnavailable={onUnavailable} />
    </div>
  );
}

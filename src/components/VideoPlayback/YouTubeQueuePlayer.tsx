"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { YouTubePlayer, type VideoPlaybackRequest, type VideoPlaybackState, type YouTubePlayerHandle } from "./YouTubePlayer";

// The queue owns completion guards and resume guidance. YouTubePlayer owns
// the iframe and API connection, keeping both alive across video changes.
export function YouTubeQueuePlayer({
  videoId, playbackKey = videoId, expanded = false, title,
  onVideoChange, onEnded, onError, onUnavailable,
}: {
  videoId: string;
  playbackKey?: string | number;
  expanded?: boolean;
  title: string;
  onVideoChange?: (videoId: string) => void;
  onEnded: (videoId?: string) => void;
  onError: () => void;
  onUnavailable: () => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const player = useRef<YouTubePlayerHandle>(null);
  const playback = useRef<{
    loaded?: VideoPlaybackRequest;
    finished: boolean;
    awaitingPlayback: boolean;
    hasStarted: boolean;
    continuation: boolean;
    reportedVideoId?: string;
  }>({ finished: false, awaitingPlayback: true, hasStarted: false, continuation: false });
  const [blocked, setBlocked] = useState(false);
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
    current.continuation = current.hasStarted;
    current.reportedVideoId = request.videoId;
    setBlocked(false);
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
      current.hasStarted = true;
      setBlocked(false);
      if (id && id !== current.reportedVideoId) {
        current.reportedVideoId = id;
        onVideoChange?.(id);
      }
    }
  };
  return (
    <div className={expanded ? "flex h-full min-h-0 flex-col gap-3" : "space-y-3"}>
      <YouTubePlayer ref={player} videoId={videoId} playbackKey={playbackKey} title={title}
        className={expanded ? "min-h-0 w-full flex-1 overflow-hidden bg-black" : "aspect-video w-full overflow-hidden rounded-xl bg-surface-muted"}
        onLoad={onLoad} onStateChange={onStateChange} onError={() => finish("error")}
        onUnavailable={onUnavailable}
        onAutoplayBlocked={() => {
          const current = playback.current;
          if (!current.finished && current.loaded?.key === playbackKey && current.continuation) setBlocked(true);
        }} />
      {blocked ? (
        <div>
          <p role="status">{t.blocked}</p>
          <button type="button"
            className="rounded-lg border border-stroke-subtle px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary"
            onClick={() => player.current?.play()}>
            {t.resume}
          </button>
        </div>
      ) : null}
    </div>
  );
}

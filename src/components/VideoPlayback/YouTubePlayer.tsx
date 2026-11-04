"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { getYouTubeVideoId } from "@kpool/wiki";
import { discardFailedYouTubeIframeApi, getYouTubePlayerConstructor, loadYouTubeIframeApi, type YouTubePlayerInstance } from "./youtubeIframeApi";

export type VideoPlaybackRequest = { videoId: string; key: string | number };
export type VideoPlaybackState = { state: number; actualState?: number; videoId?: string };
const subscribeToOrigin = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => null;

// React owns the iframe and its attributes. The API attaches to that existing
// iframe; subsequent video requests must never replace it or change its src.
export function YouTubePlayer({
  videoId, playbackKey = videoId, title, className, startSeconds = 0, onProgress,
  onLoad, onStateChange, onError, onUnavailable,
}: {
  videoId: string;
  playbackKey?: string | number;
  title: string;
  className?: string;
  startSeconds?: number;
  onProgress?: (seconds: number, videoId: string) => void;
  onLoad?: (request: VideoPlaybackRequest) => void;
  onStateChange?: (state: VideoPlaybackState) => void;
  onError?: () => void;
  onUnavailable: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const loadRequest = useRef<((request: VideoPlaybackRequest) => void) | null>(null);
  const origin = useSyncExternalStore(subscribeToOrigin, browserOrigin, serverOrigin);
  const [initialRequest] = useState(() => ({ videoId, key: playbackKey }));
  const [initialSeconds] = useState(startSeconds);
  const latestRequest = useEffectEvent(() => ({ videoId, key: playbackKey }));
  const reportLoad = useEffectEvent((request: VideoPlaybackRequest) => onLoad?.(request));
  const reportState = useEffectEvent((state: VideoPlaybackState) => onStateChange?.(state));
  const reportProgress = useEffectEvent((seconds: number, id: string) => onProgress?.(seconds, id));
  const reportError = useEffectEvent(() => onError?.());
  const reportUnavailable = useEffectEvent(onUnavailable);

  useEffect(() => {
    loadRequest.current?.({ videoId, key: playbackKey });
  }, [videoId, playbackKey]);

  useEffect(() => {
    const element = frame.current;
    if (!origin || !element) return;
    let disposed = false;
    let unavailable = false;
    let creating = false;
    let ready = false;
    let pendingSeek = 0;
    let player: YouTubePlayerInstance | undefined;
    let loaded: VideoPlaybackRequest | undefined;
    let playbackInterval: number | undefined;
    const stopWaiting = () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
    const fail = () => {
      if (disposed || unavailable) return;
      unavailable = true;
      stopWaiting();
      window.clearInterval(playbackInterval);
      discardFailedYouTubeIframeApi(script);
      reportUnavailable();
    };
    const load = (next: VideoPlaybackRequest, initial = false) => {
      if (disposed || unavailable || !ready || !player) return;
      if (!initial && loaded?.key === next.key && loaded.videoId === next.videoId) return;
      if (getYouTubeVideoId(next.videoId) !== next.videoId) {
        fail();
        return;
      }
      loaded = next;
      if (!initial) pendingSeek = 0;
      if (!initial) reportLoad(next);
      if (initial) {
        if (initialSeconds > 0 && player.seekTo) {
          pendingSeek = initialSeconds;
          player.seekTo(initialSeconds, true);
        }
        player.playVideo();
      } else player.loadVideoById(next.videoId);
    };
    const reportPlayback = (state: number | undefined) => {
      if (disposed || unavailable || state === undefined) return;
      reportState({
        state,
        actualState: player?.getPlayerState?.(),
        videoId: getYouTubeVideoId(player?.getVideoUrl?.() ?? "") ?? undefined,
      });
      if (state !== 1 && state !== 2) return;
      const id = getYouTubeVideoId(player?.getVideoUrl?.() ?? "");
      const seconds = player?.getCurrentTime?.();
      if (!id || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return;
      // Ignore the pre-seek timestamp while the restored position is applied.
      if (pendingSeek > 0 && seconds < pendingSeek - 1) return;
      pendingSeek = 0;
      reportProgress(seconds, id);
    };
    loadRequest.current = load;
    const script = loadYouTubeIframeApi();
    script?.addEventListener("error", fail);
    const tick = () => {
      if (disposed || unavailable || creating) return;
      const Constructor = getYouTubePlayerConstructor();
      if (!Constructor) return;
      creating = true;
      // Defer API attachment so a cancelled mount (including Strict Mode's
      // setup/cleanup replay) cannot destroy a React-owned iframe still in use.
      void Promise.resolve().then(() => {
        if (disposed || unavailable) return;
        if (getYouTubeVideoId(initialRequest.videoId) !== initialRequest.videoId) { fail(); return; }
        loaded = initialRequest;
        reportLoad(initialRequest);
        player = new Constructor(element, {
          videoId: initialRequest.videoId,
          host: "https://www.youtube-nocookie.com",
          width: "100%", height: "100%",
          playerVars: { origin, playsinline: 1 },
          events: {
            onReady: () => {
              if (disposed || unavailable || ready) return;
              ready = true;
              stopWaiting();
              playbackInterval = window.setInterval(() => reportPlayback(player?.getPlayerState?.()), 500);
              const latest = latestRequest();
              load(latest, loaded?.key === latest.key && loaded.videoId === latest.videoId);
            },
            onStateChange: ({ data }) => reportPlayback(data),
            onError: () => { if (!disposed && !unavailable) reportError(); },
            onAutoplayBlocked: () => {},
          },
        });
      }).catch(fail);
    };
    const interval = window.setInterval(tick, 250);
    const timeout = window.setTimeout(fail, 20_000);
    tick();
    return () => {
      disposed = true;
      stopWaiting();
      window.clearInterval(playbackInterval);
      script?.removeEventListener("error", fail);
      loadRequest.current = null;
      player?.destroy();
    };
  }, [origin, initialRequest, initialSeconds]);

  const src = origin && getYouTubeVideoId(initialRequest.videoId) === initialRequest.videoId
    ? `https://www.youtube-nocookie.com/embed/${initialRequest.videoId}?${new URLSearchParams({ enablejsapi: "1", origin, playsinline: "1" })}`
    : undefined;
  return (
    <div className={className}>
      <iframe ref={frame} src={src} title={title} width="100%" height="100%"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen className="block h-full w-full border-0" />
    </div>
  );
}

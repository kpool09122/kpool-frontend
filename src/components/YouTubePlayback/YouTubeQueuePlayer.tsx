"use client";

import { useEffect, useRef, useState } from "react";
import { getYouTubeVideoId } from "@kpool/wiki";
import { useI18n } from "@/i18n/I18nProvider";

type Player = {
  playVideo: () => void;
  loadVideoById: (videoId: string) => void;
  destroy: () => void;
  getVideoUrl?: () => string;
  getPlayerState?: () => number;
};
export type QueuePlayerOptions = {
  videoId: string;
  host: string;
  width: string;
  height: string;
  playerVars: { origin: string; playsinline: number };
  events: {
    onReady: () => void;
    onStateChange: (event: { data: number }) => void;
    onError: () => void;
    onAutoplayBlocked: () => void;
  };
};
type YouTubeWindow = Window & {
  YT?: {
    Player?: new (element: HTMLElement, options: QueuePlayerOptions) => Player;
  };
};
type PlaybackRequest = { videoId: string; key: string | number };

// Keep the iframe for the entire playback session, including repeated videos.
// The parent owns the queue; this boundary loads each request into that player.
export function YouTubeQueuePlayer({
  videoId,
  playbackKey = videoId,
  title,
  onVideoChange,
  onEnded,
  onError,
  onUnavailable,
}: {
  videoId: string;
  playbackKey?: string | number;
  title: string;
  onVideoChange?: (videoId: string) => void;
  onEnded: (videoId?: string) => void;
  onError: () => void;
  onUnavailable: () => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const container = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | undefined>(undefined);
  const callbacks = useRef({ onEnded, onError, onUnavailable, onVideoChange });
  const titleRef = useRef(title);
  const request = useRef<PlaybackRequest>({ videoId, key: playbackKey });
  const loadRequest = useRef<((next: PlaybackRequest) => void) | null>(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    callbacks.current = { onEnded, onError, onUnavailable, onVideoChange };
  }, [onEnded, onError, onUnavailable, onVideoChange]);
  useEffect(() => {
    titleRef.current = title;
    container.current?.querySelector("iframe")?.setAttribute("title", title);
  }, [title]);
  useEffect(() => {
    request.current = { videoId, key: playbackKey };
    loadRequest.current?.(request.current);
  }, [videoId, playbackKey]);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const element = document.createElement("div");
    root.appendChild(element);
    let disposed = false;
    let unavailable = false;
    let finished = false;
    let creating = false;
    let ready = false;
    let awaitingPlayback = true;
    let player: Player | undefined;
    let loaded: PlaybackRequest | undefined;
    let reportedVideoId = request.current.videoId;
    let playbackInterval: number | undefined;
    const currentVideoId = () =>
      getYouTubeVideoId(player?.getVideoUrl?.() ?? "") ?? undefined;
    const stopWaiting = () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
    const fail = () => {
      if (disposed || unavailable) return;
      unavailable = true;
      stopWaiting();
      window.clearInterval(playbackInterval);
      if (!(window as YouTubeWindow).YT?.Player) script?.remove();
      callbacks.current.onUnavailable();
    };
    const finish = (kind: "onEnded" | "onError") => {
      if (
        disposed || unavailable || finished ||
        loaded?.key !== request.current.key
      ) return;
      if (kind === "onEnded" && awaitingPlayback) return;
      finished = true;
      if (kind === "onEnded") callbacks.current.onEnded(currentVideoId());
      else callbacks.current.onError();
    };
    const checkPlayback = (state: number | undefined) => {
      if (disposed || unavailable || finished) return;
      if (state === 0) {
        // A delayed ENDED notification must not finish an item already playing.
        if (player?.getPlayerState && player.getPlayerState() !== 0) return;
        finish("onEnded");
      } else if (state === 1) {
        const id = currentVideoId();
        // loadVideoById can leave the old video's state visible briefly.
        if (awaitingPlayback && id && id !== loaded?.videoId) return;
        awaitingPlayback = false;
        setBlocked(false);
        if (id && id !== reportedVideoId) {
          reportedVideoId = id;
          callbacks.current.onVideoChange?.(id);
        }
      }
    };
    const begin = (next: PlaybackRequest, initial = false) => {
      if (disposed || unavailable || !ready || !player) return;
      if (!initial && loaded?.key === next.key && loaded.videoId === next.videoId) return;
      if (getYouTubeVideoId(next.videoId) !== next.videoId) {
        fail();
        return;
      }
      loaded = next;
      finished = false;
      awaitingPlayback = true;
      reportedVideoId = next.videoId;
      setBlocked(false);
      root.querySelector("iframe")?.setAttribute("title", titleRef.current);
      if (initial) player.playVideo();
      else player.loadVideoById(next.videoId);
    };
    loadRequest.current = (next) => begin(next);
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!script && !(window as YouTubeWindow).YT?.Player) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    script?.addEventListener("error", fail);
    const tick = () => {
      if (disposed || unavailable || creating) return;
      const Constructor = (window as YouTubeWindow).YT?.Player;
      if (!Constructor) return;
      creating = true;
      void Promise.resolve().then(() => {
        if (disposed || unavailable) return;
        const initial = request.current;
        if (getYouTubeVideoId(initial.videoId) !== initial.videoId) {
          fail();
          return;
        }
        loaded = initial;
        player = new Constructor(element, {
          videoId: initial.videoId,
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          playerVars: { origin: window.location.origin, playsinline: 1 },
          events: {
            onReady: () => {
              if (disposed || unavailable || ready) return;
              ready = true;
              stopWaiting();
              root.querySelector("iframe")?.setAttribute(
                "allow",
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              );
              playbackInterval = window.setInterval(
                () => checkPlayback(player?.getPlayerState?.()), 500,
              );
              const latest = request.current;
              begin(latest, loaded?.key === latest.key && loaded.videoId === latest.videoId);
            },
            onStateChange: ({ data }) => checkPlayback(data),
            onError: () => finish("onError"),
            onAutoplayBlocked: () => {
              if (!disposed && !unavailable && !finished) setBlocked(true);
            },
          },
        });
        playerRef.current = player;
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
      playerRef.current = undefined;
      player?.destroy();
      root.replaceChildren();
    };
  }, []);
  return (
    <div className="space-y-3">
      <div
        ref={container}
        className="aspect-video w-full overflow-hidden rounded-xl bg-surface-muted"
      />
      {blocked ? (
        <div>
          <p role="status">{t.blocked}</p>
          <button
            type="button"
            className="rounded-lg border border-stroke-subtle px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary"
            onClick={() => playerRef.current?.playVideo()}
          >
            {t.resume}
          </button>
        </div>
      ) : null}
    </div>
  );
}
